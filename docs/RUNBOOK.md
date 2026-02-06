# Car Rental Operational Runbook

> **Last Updated:** 2026-02-06
> **Audience:** DevOps, On-call Engineers, Platform Team
> **Severity Levels:** P1 (Critical), P2 (High), P3 (Medium), P4 (Low)

---

## Table of Contents

- [1. Service Overview](#1-service-overview)
- [2. Health Checks](#2-health-checks)
- [3. Common Issues and Resolutions](#3-common-issues-and-resolutions)
- [4. Deployment Procedures](#4-deployment-procedures)
- [5. Monitoring Alerts and Response](#5-monitoring-alerts-and-response)
- [6. Backup and Restore](#6-backup-and-restore)
- [7. Scaling Procedures](#7-scaling-procedures)
- [8. Contact and Escalation](#8-contact-and-escalation)

---

## 1. Service Overview

| Service        | Container               | Port(s)     | Health Endpoint                              |
| -------------- | ----------------------- | ----------- | -------------------------------------------- |
| NestJS API     | `api`                   | 3000        | `GET /api/v1/health`                         |
| Next.js Web    | `web`                   | 3000 (int)  | HTTP 200 on `/`                              |
| PostgreSQL 16  | `postgres`              | 5432        | `pg_isready -U $POSTGRES_USER`               |
| Redis 7        | `redis`                 | 6379        | `redis-cli ping` -> `PONG`                   |
| MinIO          | `minio`                 | 9000 / 9001 | `GET http://localhost:9000/minio/health/live` |
| Nginx          | `nginx`                 | 80 / 443    | HTTP 301/200                                 |
| Prometheus     | `prometheus`            | 9090        | `GET /-/healthy`                              |
| Grafana        | `grafana`               | 3002        | `GET /api/health`                             |
| Alertmanager   | `alertmanager`          | 9093        | `GET /-/healthy`                              |

**Production path:** `/opt/carrental` on the VPS.

---

## 2. Health Checks

### 2.1 Quick Health Check (All Services)

```bash
# Check all container statuses
docker compose -f docker-compose.prod.yml ps

# API health
curl -sf http://localhost:3000/api/v1/health | jq .

# PostgreSQL
docker exec postgres pg_isready -U "$POSTGRES_USER" -d carrental

# Redis
docker exec redis redis-cli ping

# MinIO
curl -sf http://localhost:9000/minio/health/live
```

### 2.2 Deep Health Check Script

```bash
#!/bin/bash
echo "=== Car Rental Health Check ==="

# API
if curl -sf http://localhost:3000/api/v1/health > /dev/null 2>&1; then
  echo "[OK] API is healthy"
else
  echo "[FAIL] API is not responding"
fi

# PostgreSQL
if docker exec postgres pg_isready -U "$POSTGRES_USER" > /dev/null 2>&1; then
  echo "[OK] PostgreSQL is ready"
else
  echo "[FAIL] PostgreSQL is not ready"
fi

# Redis
if docker exec redis redis-cli ping > /dev/null 2>&1; then
  echo "[OK] Redis is responding"
else
  echo "[WARN] Redis is down (fallback cache active)"
fi

# MinIO
if curl -sf http://localhost:9000/minio/health/live > /dev/null 2>&1; then
  echo "[OK] MinIO is healthy"
else
  echo "[FAIL] MinIO is not responding"
fi

# Disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_USAGE" -gt 85 ]; then
  echo "[WARN] Disk usage at ${DISK_USAGE}%"
else
  echo "[OK] Disk usage at ${DISK_USAGE}%"
fi
```

---

## 3. Common Issues and Resolutions

### 3.1 API Not Responding

**Severity:** P1
**Symptoms:** 502/503 from Nginx, `/api/v1/health` returns error or times out.

**Diagnosis:**

```bash
# Check container status
docker ps -a --filter name=api

# Check API logs (last 100 lines)
docker logs api --tail 100

# Check resource usage
docker stats api --no-stream
```

**Resolution:**

| Step | Action | Command |
| ---- | ------ | ------- |
| 1 | Check if container is running | `docker ps --filter name=api` |
| 2 | Inspect logs for errors | `docker logs api --tail 200 2>&1 \| grep -i error` |
| 3 | Check if port is bound | `docker port api` |
| 4 | Restart the API container | `docker compose -f docker-compose.prod.yml restart api` |
| 5 | If OOM killed, increase memory limit | Edit `docker-compose.prod.yml` -> `deploy.resources.limits.memory` |
| 6 | Full rebuild if image is corrupted | `docker compose -f docker-compose.prod.yml up -d --build api` |

---

### 3.2 Database Connection Issues

**Severity:** P1
**Symptoms:** API logs show `PrismaClientInitializationError`, connection refused, pool exhausted.

**Diagnosis:**

```bash
# Check PostgreSQL container health
docker exec postgres pg_isready -U "$POSTGRES_USER" -d carrental

# Check active connections
docker exec postgres psql -U "$POSTGRES_USER" -d carrental \
  -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'carrental';"

# Check connection pool status
docker exec postgres psql -U "$POSTGRES_USER" -d carrental \
  -c "SELECT state, count(*) FROM pg_stat_activity GROUP BY state;"

# Check PostgreSQL logs
docker logs postgres --tail 100
```

**Resolution:**

| Step | Action | Command |
| ---- | ------ | ------- |
| 1 | Verify Postgres is running | `docker ps --filter name=postgres` |
| 2 | Test direct connection | `docker exec postgres psql -U $POSTGRES_USER -d carrental -c "SELECT 1;"` |
| 3 | Kill idle connections | `docker exec postgres psql -U $POSTGRES_USER -d carrental -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < now() - interval '10 minutes';"` |
| 4 | Restart PostgreSQL | `docker compose -f docker-compose.prod.yml restart postgres` |
| 5 | Restart API (reconnect pool) | `docker compose -f docker-compose.prod.yml restart api` |

**Prevention:** Monitor `pg_stat_activity` connections and set Prisma connection pool limits in `DATABASE_URL` (e.g., `?connection_limit=20&pool_timeout=10`).

---

### 3.3 Redis Down

**Severity:** P3 (service continues with degraded caching)
**Symptoms:** Slower response times, cache misses logged, API still operational.

**Impact:** The API uses Redis as an optional cache layer. When Redis is unavailable, the `RedisCacheService` falls back gracefully -- requests hit the database directly with increased latency but no functional loss.

**Diagnosis:**

```bash
# Check Redis container
docker ps --filter name=redis

# Test Redis connectivity
docker exec redis redis-cli ping

# Check memory usage
docker exec redis redis-cli info memory | grep used_memory_human

# Check connected clients
docker exec redis redis-cli info clients | grep connected_clients
```

**Resolution:**

```bash
# Restart Redis
docker compose -f docker-compose.prod.yml restart redis

# If data corruption, flush and restart
docker exec redis redis-cli FLUSHALL
docker compose -f docker-compose.prod.yml restart redis

# Restart API to re-establish connections
docker compose -f docker-compose.prod.yml restart api
```

---

### 3.4 MinIO Storage Issues

**Severity:** P2
**Symptoms:** File uploads fail, vehicle photos not loading, document downloads broken.

**Diagnosis:**

```bash
# Check MinIO health
curl -sf http://localhost:9000/minio/health/live

# Check MinIO container
docker logs minio --tail 50

# Check disk space on MinIO volume
docker exec minio df -h /data

# Check bucket exists
docker exec minio mc ls local/carrental
```

**Resolution:**

| Step | Action | Command |
| ---- | ------ | ------- |
| 1 | Check MinIO health endpoint | `curl -f http://localhost:9000/minio/health/live` |
| 2 | Inspect disk space on host | `df -h` and `docker system df` |
| 3 | Clean unused Docker resources | `docker system prune -f` |
| 4 | Restart MinIO | `docker compose -f docker-compose.prod.yml restart minio` |
| 5 | If volume is full, expand disk | Resize volume on VPS provider, then `resize2fs` |

**MinIO Console:** Accessible at port `9001` for bucket inspection and management.

---

### 3.5 High Memory Usage

**Severity:** P2
**Symptoms:** Container OOM kills, slow response times, `docker stats` shows high memory.

**Diagnosis:**

```bash
# Check all container resource usage
docker stats --no-stream

# Check API-specific memory
docker stats api --no-stream

# Check for N+1 query patterns in logs
docker logs api --tail 500 2>&1 | grep -c "prisma:query"

# Check PostgreSQL memory
docker exec postgres psql -U "$POSTGRES_USER" -d carrental \
  -c "SELECT query, calls, mean_exec_time, total_exec_time FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;"
```

**Resolution:**

1. **N+1 Queries:** Identify via Prisma query logs. Add `include` relations or use `findMany` with proper joins.
2. **Memory Limits:** Increase in `docker-compose.prod.yml`:
   ```yaml
   deploy:
     resources:
       limits:
         memory: 1G  # Increase from 512M
   ```
3. **Node.js Heap:** Set `NODE_OPTIONS=--max-old-space-size=512` in environment.
4. **Restart as immediate relief:** `docker compose -f docker-compose.prod.yml restart api`

---

## 4. Deployment Procedures

### 4.1 Pre-Deployment Checklist

- [ ] All CI checks pass on the PR (lint, test, build)
- [ ] Database migration reviewed (if any)
- [ ] Environment variables updated on server (if any new ones)
- [ ] Backup database before deploy: `bash scripts/backup-db.sh`
- [ ] Notify team in communication channel
- [ ] Verify current production health: `curl -sf https://yourdomain.com/api/v1/health`

### 4.2 Standard Deployment (via CI/CD)

Deployments are triggered automatically when a PR is merged to `main`:

1. GitHub Actions builds Docker images (`docker/Dockerfile.api.prod`, `docker/Dockerfile.web.prod`)
2. Images are pushed to `ghcr.io`
3. SSH into VPS at `/opt/carrental`
4. Pull new images and restart containers
5. Automated health check with 30s grace period
6. Auto-rollback if health check fails

### 4.3 Manual Deployment

```bash
ssh deploy@your-vps-host
cd /opt/carrental

# 1. Backup database
bash scripts/backup-db.sh

# 2. Pull latest code
git pull origin main

# 3. Build and deploy
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

# 4. Run pending migrations
docker exec api npx prisma migrate deploy

# 5. Verify health
sleep 30
curl -sf http://localhost:3000/api/v1/health | jq .

# 6. Check logs for errors
docker logs api --tail 50
```

### 4.4 Rollback Procedure

```bash
cd /opt/carrental

# 1. Stop current containers
docker compose -f docker-compose.prod.yml down

# 2. Revert to previous image (by git SHA tag)
# Option A: Revert git and rebuild
git log --oneline -5  # Find previous commit
git checkout <previous-sha>
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Option B: Pull previous image tag from registry
docker pull ghcr.io/your-org/carrental/backend:<previous-sha>
docker pull ghcr.io/your-org/carrental/frontend:<previous-sha>
docker compose -f docker-compose.prod.yml up -d

# 3. If migration was applied, restore database from backup
gunzip -c backups/car_rental_backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i postgres psql -U "$POSTGRES_USER" -d carrental

# 4. Verify rollback
curl -sf http://localhost:3000/api/v1/health | jq .
```

---

## 5. Monitoring Alerts and Response

### Alert Infrastructure

- **Prometheus:** Metrics collection at 15s intervals (`monitoring/prometheus.yml`)
- **Alertmanager:** Alert routing with email + Slack (`monitoring/alertmanager.yml`)
- **Grafana:** Dashboards at port 3002
- **Exporters:** Node Exporter (system), PostgreSQL Exporter, Redis Exporter

### 5.1 High Error Rate (5xx)

**Alert:** `HighErrorRate` fires when 5xx rate exceeds 5% over 5 minutes.

**Response:**

```bash
# 1. Identify failing endpoints
docker logs api --since 10m 2>&1 | grep -E "5[0-9]{2}" | head -20

# 2. Check error patterns
docker logs api --since 10m 2>&1 | grep "Error" | sort | uniq -c | sort -rn

# 3. Check resource saturation
docker stats --no-stream

# 4. If specific endpoint, check for recent code changes
git log --oneline -10

# 5. Mitigate: Restart if crash-looping
docker compose -f docker-compose.prod.yml restart api

# 6. Escalate if error rate persists after restart
```

### 5.2 Database Slow Queries

**Alert:** `SlowQueryRate` fires when query time P95 exceeds 500ms.

**Response:**

```bash
# 1. Identify slow queries
docker exec postgres psql -U "$POSTGRES_USER" -d carrental -c "
  SELECT query, calls, mean_exec_time::int as avg_ms, max_exec_time::int as max_ms
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 10;
"

# 2. Check for missing indexes
docker exec postgres psql -U "$POSTGRES_USER" -d carrental -c "
  SELECT relname, seq_scan, seq_tup_read, idx_scan
  FROM pg_stat_user_tables
  WHERE seq_scan > 1000
  ORDER BY seq_tup_read DESC
  LIMIT 10;
"

# 3. Check for lock contention
docker exec postgres psql -U "$POSTGRES_USER" -d carrental -c "
  SELECT blocked_locks.pid AS blocked_pid, blocked_activity.query AS blocked_query
  FROM pg_catalog.pg_locks blocked_locks
  JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
  WHERE NOT blocked_locks.granted LIMIT 5;
"

# 4. Add indexes if sequential scans are high on filtered columns
# 5. Reset stats after resolution
docker exec postgres psql -U "$POSTGRES_USER" -d carrental -c "SELECT pg_stat_statements_reset();"
```

### 5.3 Disk Space Low

**Alert:** `DiskSpaceLow` fires when available disk drops below 15%.

**Response:**

```bash
# 1. Check disk usage
df -h /

# 2. Find large directories
du -sh /var/lib/docker/volumes/* | sort -rh | head -10

# 3. Clean Docker resources
docker system prune -f
docker image prune -a -f --filter "until=168h"  # Remove images older than 7 days

# 4. Clean old backups (keep last 7 days)
find /opt/carrental/backups -name "*.sql.gz" -mtime +7 -delete

# 5. Clean old Docker logs
truncate -s 0 /var/lib/docker/containers/*/*-json.log

# 6. If still low, expand volume via VPS provider
```

---

## 6. Backup and Restore

### 6.1 Automated Backups

Backups are handled by `scripts/backup-db.sh` scheduled via cron (configured by `scripts/setup-cron-backup.sh`).

- **Frequency:** Daily at 2:00 AM
- **Retention:** 30 days (configurable via `RETENTION_DAYS`)
- **Location:** `./backups/` directory
- **Format:** `car_rental_backup_YYYYMMDD_HHMMSS.sql.gz`
- **Integrity:** Automatic gzip verification after each backup

### 6.2 Manual Backup

```bash
cd /opt/carrental

# Full database backup
bash scripts/backup-db.sh

# Verify backup
ls -lah backups/ | tail -5
```

### 6.3 Restore from Backup

```bash
# 1. Stop the API to prevent writes
docker compose -f docker-compose.prod.yml stop api web

# 2. Restore database
gunzip -c backups/car_rental_backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i postgres psql -U "$POSTGRES_USER" -d carrental

# 3. Restart services
docker compose -f docker-compose.prod.yml up -d api web

# 4. Verify data integrity
curl -sf http://localhost:3000/api/v1/health | jq .
```

### 6.4 MinIO Backup

```bash
# Install MinIO client (mc) if not present
docker exec minio mc alias set local http://localhost:9000 "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY"

# Mirror bucket to local directory
docker exec minio mc mirror local/carrental /tmp/minio-backup

# Copy backup out of container
docker cp minio:/tmp/minio-backup ./backups/minio-backup-$(date +%Y%m%d)
```

---

## 7. Scaling Procedures

### 7.1 Vertical Scaling (Single Server)

Update resource limits in `docker-compose.prod.yml`:

```yaml
# API: Increase from 512M to 1G
api:
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 1G

# PostgreSQL: Increase for heavy query workloads
postgres:
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 2G
```

Apply changes:

```bash
docker compose -f docker-compose.prod.yml up -d
```

### 7.2 Database Tuning

```bash
# Tune PostgreSQL for available memory (e.g., 2GB allocated)
docker exec postgres psql -U "$POSTGRES_USER" -c "
  ALTER SYSTEM SET shared_buffers = '512MB';
  ALTER SYSTEM SET effective_cache_size = '1536MB';
  ALTER SYSTEM SET work_mem = '16MB';
  ALTER SYSTEM SET maintenance_work_mem = '128MB';
  SELECT pg_reload_conf();
"
```

### 7.3 Horizontal Scaling Considerations

For scaling beyond a single server:

1. **API:** Stateless -- run multiple instances behind a load balancer. Ensure `JWT_SECRET` and env vars are consistent across instances.
2. **PostgreSQL:** Use managed PostgreSQL (e.g., AWS RDS, DigitalOcean Managed DB) with read replicas for analytics queries.
3. **Redis:** Switch to managed Redis or Redis Sentinel for HA.
4. **MinIO:** Scale to distributed mode with multiple nodes, or migrate to S3.
5. **Static Assets:** Add a CDN (CloudFront, Cloudflare) in front of Nginx for Next.js static files.

---

## 8. Contact and Escalation

| Severity | Response Time | Escalation Path                   |
| -------- | ------------- | --------------------------------- |
| P1       | 15 min        | On-call -> Tech Lead -> CTO       |
| P2       | 1 hour        | On-call -> Tech Lead              |
| P3       | 4 hours       | On-call                           |
| P4       | Next business | On-call (next business day)       |

**Channels:**
- Slack: `#alerts` (critical alerts auto-posted)
- Email: Alertmanager sends to configured `ALERT_EMAIL_TO`
- Monitoring: Grafana at `https://yourdomain.com:3002`
