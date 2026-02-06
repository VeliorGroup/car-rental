# FleetPulse Disaster Recovery Plan

> **Last Updated:** 2026-02-06
> **Document Owner:** Platform Engineering
> **Review Cadence:** Quarterly
> **Classification:** Internal -- Confidential

---

## Table of Contents

- [1. Recovery Objectives](#1-recovery-objectives)
- [2. Backup Strategy](#2-backup-strategy)
- [3. Disaster Scenarios and Recovery Procedures](#3-disaster-scenarios-and-recovery-procedures)
- [4. Communication Plan](#4-communication-plan)
- [5. DR Testing](#5-dr-testing)
- [6. Post-Incident Review Template](#6-post-incident-review-template)

---

## 1. Recovery Objectives

| Metric | Target | Notes |
| ------ | ------ | ----- |
| **RPO** (Recovery Point Objective) | **24 hours** | Daily automated backups at 02:00 UTC |
| **RTO** (Recovery Time Objective) | **4 hours** | From incident declaration to service restoration |
| **MTTR** (Mean Time to Repair) | **2 hours** | Target average for P1 incidents |

### Service Tier Classification

| Tier | Services | Max Downtime | Recovery Priority |
| ---- | -------- | ------------ | ----------------- |
| 1 (Critical) | API, PostgreSQL, Nginx | 1 hour | Immediate |
| 2 (Important) | Redis, MinIO, Web Frontend | 2 hours | High |
| 3 (Supporting) | Prometheus, Grafana, Alertmanager | 8 hours | Normal |

---

## 2. Backup Strategy

### 2.1 Database Backups

| Type | Frequency | Retention | Tool | Location |
| ---- | --------- | --------- | ---- | -------- |
| Automated daily | Daily 02:00 UTC | 30 days | `scripts/backup-db.sh` | `./backups/` on VPS |
| Pre-deployment | Before each deploy | 7 days | `scripts/backup-db.sh` | `./backups/` on VPS |
| Manual (on-demand) | As needed | Until deleted | `scripts/backup-db.sh` | `./backups/` on VPS |

**Backup format:** `car_rental_backup_YYYYMMDD_HHMMSS.sql.gz`

**Backup script features:**
- Extracts connection details from `DATABASE_URL`
- Uses `pg_dump` with `--clean --if-exists --no-owner --no-acl`
- Compresses with gzip
- Automatic integrity verification (`gunzip -t`)
- Purges backups older than `RETENTION_DAYS` (default: 30)

### 2.2 File Storage Backups (MinIO)

| Type | Frequency | Retention | Method |
| ---- | --------- | --------- | ------ |
| Volume snapshot | Weekly | 4 weeks | Docker volume or VPS snapshot |
| Bucket mirror | Weekly | 4 weeks | `mc mirror` to backup location |

### 2.3 Configuration Backups

| Item | Method | Location |
| ---- | ------ | -------- |
| `.env` files | Encrypted copy | Secure vault / password manager |
| Docker compose files | Git repository | GitHub (private repo) |
| Nginx config | Git repository | `docker/nginx/nginx.conf` |
| SSL certificates | Let's Encrypt auto-renewal | `/etc/letsencrypt/` |
| Monitoring configs | Git repository | `monitoring/` directory |

### 2.4 Offsite Backup (Recommended)

```bash
# Sync backups to S3-compatible offsite storage
# Configure in scripts/backup-db.sh (uncomment S3 section)
aws s3 sync ./backups/ s3://$S3_BUCKET/fleetpulse/db-backups/ \
  --storage-class STANDARD_IA \
  --exclude "*" --include "*.sql.gz"
```

---

## 3. Disaster Scenarios and Recovery Procedures

### 3.1 Database Corruption or Loss

**Severity:** P1 | **RTO:** 2 hours | **RPO:** 24 hours

**Symptoms:** API returns 500 errors, Prisma connection failures, data inconsistency.

**Recovery Steps:**

```bash
# 1. Stop the application to prevent further damage
ssh deploy@your-vps
cd /opt/fleetpulse
docker compose -f docker-compose.prod.yml stop api web

# 2. Identify the latest valid backup
ls -lah backups/*.sql.gz | tail -5

# 3. Drop and recreate the database
docker exec postgres psql -U "$POSTGRES_USER" -c "
  SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'fleetpulse';
"
docker exec postgres dropdb -U "$POSTGRES_USER" fleetpulse
docker exec postgres createdb -U "$POSTGRES_USER" fleetpulse

# 4. Restore from backup
gunzip -c backups/car_rental_backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i postgres psql -U "$POSTGRES_USER" -d fleetpulse

# 5. Run any pending Prisma migrations
docker compose -f docker-compose.prod.yml run --rm api npx prisma migrate deploy

# 6. Restart application
docker compose -f docker-compose.prod.yml up -d api web

# 7. Verify data integrity
curl -sf http://localhost:3000/api/v1/health | jq .

# 8. Spot-check critical data (tenant count, recent bookings)
docker exec postgres psql -U "$POSTGRES_USER" -d fleetpulse -c "
  SELECT 'tenants' as entity, count(*) FROM \"Tenant\"
  UNION ALL SELECT 'bookings', count(*) FROM \"Booking\"
  UNION ALL SELECT 'vehicles', count(*) FROM \"Vehicle\"
  UNION ALL SELECT 'customers', count(*) FROM \"Customer\";
"
```

**Data Loss Window:** Up to 24 hours of data since last backup. Consider enabling PostgreSQL WAL archiving for point-in-time recovery if RPO < 24h is needed.

---

### 3.2 Complete Server Failure

**Severity:** P1 | **RTO:** 4 hours | **RPO:** 24 hours

**Symptoms:** VPS unreachable, SSH timeout, all services down.

**Recovery Steps:**

```bash
# 1. Provision new VPS from provider (DigitalOcean, Hetzner, etc.)
#    - Same region, same or higher specs
#    - Ubuntu 22.04+ LTS

# 2. Initial server setup
ssh root@new-server
bash scripts/vps-setup.sh  # From a local copy or git clone

# 3. Install Docker and Docker Compose
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin

# 4. Clone repository
git clone https://github.com/your-org/fleetpulse.git /opt/fleetpulse
cd /opt/fleetpulse

# 5. Restore environment configuration
#    Copy .env from secure vault / password manager
cp /path/to/secure/.env .env

# 6. Start infrastructure services first
docker compose -f docker-compose.prod.yml up -d postgres redis minio
sleep 30  # Wait for services to initialize

# 7. Restore database from offsite backup
# Option A: From S3
aws s3 cp s3://$S3_BUCKET/fleetpulse/db-backups/latest.sql.gz ./backups/
# Option B: From local machine
scp backups/car_rental_backup_YYYYMMDD_HHMMSS.sql.gz deploy@new-server:/opt/fleetpulse/backups/

gunzip -c backups/car_rental_backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i postgres psql -U "$POSTGRES_USER" -d fleetpulse

# 8. Restore MinIO data (if offsite backup exists)
docker exec minio mc mirror /backup/minio local/fleetpulse

# 9. Build and start application
docker compose -f docker-compose.prod.yml up -d --build

# 10. Run database migrations
docker exec api npx prisma migrate deploy

# 11. Setup SSL certificates
bash scripts/setup-ssl.sh

# 12. Update DNS to point to new server IP
# (via your DNS provider: Cloudflare, Route53, etc.)

# 13. Verify all services
curl -sf https://yourdomain.com/api/v1/health | jq .

# 14. Re-setup cron jobs
bash scripts/setup-cron-backup.sh
```

---

### 3.3 Application Redeploy from Container Registry

**Severity:** P2 | **RTO:** 1 hour

For cases where application code is corrupted but infrastructure is intact:

```bash
cd /opt/fleetpulse

# 1. Pull images from GitHub Container Registry
docker login ghcr.io -u USERNAME --password-stdin <<< "$GITHUB_TOKEN"
docker pull ghcr.io/your-org/fleetpulse/backend:latest
docker pull ghcr.io/your-org/fleetpulse/frontend:latest

# 2. Restart with fresh images
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

# 3. Verify
curl -sf http://localhost:3000/api/v1/health | jq .
```

---

### 3.4 MinIO Data Recovery

**Severity:** P2 | **RTO:** 2 hours

**Impact:** Vehicle photos, documents, digital signatures unavailable.

```bash
# 1. Check if MinIO volume still has data
docker volume inspect carrental_minio-data

# 2. If volume is intact, restart MinIO
docker compose -f docker-compose.prod.yml restart minio

# 3. If volume is lost, restore from backup
docker compose -f docker-compose.prod.yml up -d minio
sleep 10

# Restore from offsite mirror
docker exec minio mc alias set local http://localhost:9000 "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY"
docker exec minio mc mb local/fleetpulse --ignore-existing

# Copy backup data into the container
docker cp ./backups/minio-backup-YYYYMMDD/. minio:/tmp/restore/
docker exec minio mc mirror /tmp/restore local/fleetpulse

# 4. Verify bucket contents
docker exec minio mc ls local/fleetpulse --recursive --summarize
```

---

### 3.5 DNS Failover

**Severity:** P1 | **RTO:** 30 minutes (DNS propagation dependent)

If the primary server is unreachable and a standby is available:

1. **Update DNS A record** to point to the standby server IP
2. **Set low TTL** (60s) on DNS records proactively to enable fast failover
3. **Verify propagation:** `dig +short yourdomain.com`
4. **If using Cloudflare:** Failover is near-instant via proxy

**Recommended DNS Configuration:**

```
Type  Name              Value           TTL
A     yourdomain.com    PRIMARY_IP      60
A     yourdomain.com    STANDBY_IP      60   (add during failover)
```

---

## 4. Communication Plan

### 4.1 Incident Severity Matrix

| Severity | Impact | Notification | Update Cadence |
| -------- | ------ | ------------ | -------------- |
| P1 | Full outage, data loss risk | Immediate: Slack, Email, Phone | Every 30 min |
| P2 | Partial outage, degraded service | Within 15 min: Slack, Email | Every 1 hour |
| P3 | Minor degradation | Within 1 hour: Slack | As resolved |

### 4.2 Communication Templates

**Incident Declaration:**

```
[INCIDENT] FleetPulse - {SEVERITY}
Status: Investigating
Impact: {description of user impact}
Start Time: {UTC timestamp}
Incident Commander: {name}
Next Update: {time}
```

**Status Update:**

```
[UPDATE] FleetPulse - {SEVERITY}
Status: {Investigating | Identified | Monitoring | Resolved}
Summary: {what changed since last update}
ETA to Resolution: {estimate}
Next Update: {time}
```

**Resolution Notice:**

```
[RESOLVED] FleetPulse - {SEVERITY}
Duration: {total downtime}
Root Cause: {brief summary}
Impact: {affected users/tenants}
Follow-up: Post-incident review scheduled for {date}
```

### 4.3 Stakeholder Notification

| Role | When Notified | How |
| ---- | ------------- | --- |
| On-call Engineer | Immediately (auto) | Alertmanager -> Slack / Email |
| Tech Lead | P1: Immediately, P2: 15 min | Slack / Phone |
| CTO | P1 only: 15 min | Phone call |
| Affected Tenants | P1: 1 hour, P2: 2 hours | Email via tenant contact |

---

## 5. DR Testing

### 5.1 Test Schedule

| Test | Frequency | Last Tested | Next Scheduled |
| ---- | --------- | ----------- | -------------- |
| Database backup & restore | Monthly | -- | -- |
| Full server rebuild | Quarterly | -- | -- |
| DNS failover | Semi-annually | -- | -- |
| Communication plan drill | Annually | -- | -- |

### 5.2 Database Recovery Test

```bash
# Run on a staging/test environment, never on production

# 1. Take a fresh backup
bash scripts/backup-db.sh

# 2. Create a test database
docker exec postgres createdb -U "$POSTGRES_USER" fleetpulse_dr_test

# 3. Restore to test database
gunzip -c backups/car_rental_backup_*.sql.gz | \
  docker exec -i postgres psql -U "$POSTGRES_USER" -d fleetpulse_dr_test

# 4. Verify record counts
docker exec postgres psql -U "$POSTGRES_USER" -d fleetpulse_dr_test -c "
  SELECT 'tenants' as entity, count(*) FROM \"Tenant\"
  UNION ALL SELECT 'bookings', count(*) FROM \"Booking\"
  UNION ALL SELECT 'vehicles', count(*) FROM \"Vehicle\";
"

# 5. Cleanup test database
docker exec postgres dropdb -U "$POSTGRES_USER" fleetpulse_dr_test

# 6. Document results
echo "DR Test $(date): Database restore successful" >> docs/dr-test-log.txt
```

---

## 6. Post-Incident Review Template

Use this template within 48 hours of incident resolution.

```markdown
# Post-Incident Review: [INCIDENT TITLE]

## Summary
- **Date:** YYYY-MM-DD
- **Duration:** X hours Y minutes
- **Severity:** P1 / P2 / P3
- **Incident Commander:** [Name]
- **Author:** [Name]

## Timeline (UTC)
| Time | Event |
| ---- | ----- |
| HH:MM | First alert triggered |
| HH:MM | Incident declared |
| HH:MM | Root cause identified |
| HH:MM | Fix deployed |
| HH:MM | Service restored |
| HH:MM | All-clear declared |

## Impact
- **Users affected:** [number / percentage]
- **Tenants affected:** [list]
- **Data loss:** [none / description]
- **Revenue impact:** [estimate if applicable]

## Root Cause
[Detailed technical explanation of what caused the incident]

## What Went Well
- [List things that worked during incident response]

## What Went Poorly
- [List things that didn't work or were slow]

## Action Items
| Action | Owner | Priority | Due Date | Status |
| ------ | ----- | -------- | -------- | ------ |
| [action] | [name] | P1/P2/P3 | YYYY-MM-DD | Open |

## Lessons Learned
[Key takeaways for preventing similar incidents]

## Related Documents
- Runbook used: [link]
- Alert that fired: [link to Grafana/Alertmanager]
- Backup used: [filename]
```

---

## Appendix: Key File Locations

| Item | Path |
| ---- | ---- |
| Production compose | `docker-compose.prod.yml` |
| Monitoring compose | `docker-compose.monitoring.yml` |
| Backup script | `scripts/backup-db.sh` |
| Cron setup | `scripts/setup-cron-backup.sh` |
| Deploy script | `scripts/deploy.sh` |
| VPS setup | `scripts/vps-setup.sh` |
| SSL setup | `scripts/setup-ssl.sh` |
| Nginx config | `docker/nginx/nginx.conf` |
| Prometheus config | `monitoring/prometheus.yml` |
| Alertmanager config | `monitoring/alertmanager.yml` |
| Prisma schema | `apps/api/prisma/schema.prisma` |
| CI/CD pipeline | `.github/workflows/deploy.yml` |
