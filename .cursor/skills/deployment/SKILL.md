---
name: deployment
description: Deployment e rilascio in produzione per Car Rental. Usa quando devi deployare su VPS, configurare SSL, gestire migrazioni database in produzione, o configurare CI/CD.
---

# Deployment — Car Rental

## Deploy produzione

```bash
# 1. Build immagini
docker-compose -f docker-compose.prod.yml build

# 2. Migrazioni database (PRIMA di avviare l'app)
docker-compose -f docker-compose.prod.yml run --rm api npx prisma migrate deploy

# 3. Avvia servizi
docker-compose -f docker-compose.prod.yml up -d
```

## Script deploy

```bash
./scripts/deploy.sh
# oppure
npm run deploy
```

## Variabili d'ambiente produzione

File `.env` — mai committare in git. Variabili critiche:

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db?schema=public
DIRECT_URL=postgresql://user:pass@host:5432/db?schema=public
REDIS_URL=redis://:password@host:6379
JWT_SECRET=<stringa_lunga_random>
MINIO_ACCESS_KEY=<key>
MINIO_SECRET_KEY=<secret>
RESEND_API_KEY=<key>
PAYSERA_PROJECT_ID=<id>
PAYSERA_SECRET=<secret>
```

## Migrazioni in produzione

```bash
# SEMPRE deploy, MAI dev in produzione
npx prisma migrate deploy

# Verificare stato migrazioni
npx prisma migrate status
```

## Health check endpoints

- API: `GET /api/v1/health` → `{ status: 'ok' }`
- Web: risponde sulla porta configurata

## Rollback

```bash
# Tornare all'immagine precedente
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# In caso di migrazione fallita
npx prisma migrate resolve --rolled-back <migration_name>
```

## CI/CD GitHub Actions

Configurato in `.github/workflows/`. Il workflow:
1. Build immagini Docker
2. Push su registry
3. Deploy su VPS via SSH
4. Verifica health check
