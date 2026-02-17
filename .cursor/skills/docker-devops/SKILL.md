---
name: docker-devops
description: Configurazione Docker, docker-compose, e gestione infrastruttura per Car Rental. Usa quando lavori con container, servizi Docker, monitoring stack, o configurazione ambiente di sviluppo.
---

# Docker & DevOps — Car Rental

## Comandi principali

```bash
# Sviluppo completo (tutti i servizi)
npm run docker:dev
# oppure
docker-compose up -d

# Solo servizi infrastruttura (postgres, redis, minio)
docker-compose -f docker-compose.services.yml up -d

# Solo applicazioni
docker-compose -f docker-compose.app.yml up -d

# Produzione
docker-compose -f docker-compose.prod.yml up -d

# Monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

## Gestione container

```bash
# Stato
docker-compose ps

# Logs in tempo reale
docker-compose logs -f api
docker-compose logs -f web
docker-compose logs -f postgres

# Rebuild singolo servizio
docker-compose build --no-cache api
docker-compose build --no-cache web

# Restart con rebuild
docker-compose up -d --force-recreate api

# Stop completo
docker-compose down

# Stop + rimuovi volumi (ATTENZIONE: cancella dati)
docker-compose down -v
```

## Servizi disponibili

| Servizio | Porta | URL |
|----------|-------|-----|
| `api` | 3000 | http://localhost:3000 |
| `web` | 3001 | http://localhost:3001 |
| `postgres` | 5432 | postgresql://localhost:5432 |
| `redis` | 6379 | redis://localhost:6379 |
| `minio` | 9000 | http://localhost:9000 |
| `minio` console | 9001 | http://localhost:9001 |

## Immagini custom

```yaml
api:
  image: api:latest
  build:
    context: ./apps/api
    dockerfile: Dockerfile

web:
  image: web:latest
  build:
    context: ./apps/web
    dockerfile: Dockerfile
```

## Rimozione immagini vecchie

```bash
# Rimuovi immagini non taggate
docker image prune -f

# Rimuovi immagine specifica
docker rmi api:latest web:latest

# Pulizia completa
docker system prune -f
```

## Monitoring stack

Grafana disponibile dopo `docker-compose -f docker-compose.monitoring.yml up -d`:
- Grafana: http://localhost:3333
- Prometheus: http://localhost:9090
- Dashboard: `monitoring/grafana/provisioning/dashboards/`
