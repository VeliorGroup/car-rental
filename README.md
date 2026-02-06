# 🚗 Car Rental Platform

Piattaforma SaaS multi-tenant completa per la gestione del noleggio auto con marketplace integrato.

## 📋 Indice

- [Panoramica](#panoramica)
- [Stack Tecnologico](#stack-tecnologico)
- [Architettura](#architettura)
- [Setup Sviluppo](#setup-sviluppo)
- [Deployment](#deployment)
- [Documentazione](#documentazione)
- [Testing](#testing)
- [Contribuire](#contribuire)

## 🎯 Panoramica

Car Rental Platform è una soluzione completa per la gestione di flotte di veicoli a noleggio, con supporto multi-tenant, marketplace pubblico, sistema di abbonamenti e gestione completa del ciclo di vita delle prenotazioni.

### Caratteristiche Principali

- ✅ **Multi-Tenancy**: Isolamento completo dei dati per tenant
- ✅ **Marketplace**: Prenotazioni pubbliche con commissioni piattaforma
- ✅ **Gestione Completa**: Veicoli, prenotazioni, danni, manutenzioni, pneumatici
- ✅ **Pagamenti**: Integrazione Paysera e Stripe
- ✅ **Sicurezza**: 2FA, RBAC, audit logging
- ✅ **i18n**: Supporto 12 lingue
- ✅ **Analytics**: Dashboard e report avanzati

## 🛠 Stack Tecnologico

### Backend
- **Framework**: NestJS 11
- **Database**: PostgreSQL + Prisma ORM
- **Cache**: Redis (ioredis)
- **Queue**: pg-boss
- **Storage**: MinIO (S3-compatible)
- **Autenticazione**: JWT + Passport + 2FA (TOTP)
- **Pagamenti**: Paysera, Stripe
- **Email/SMS**: SendGrid, Resend, Twilio
- **Monitoring**: Winston, Prometheus

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Radix UI, Tailwind CSS 4
- **State**: Zustand, TanStack Query
- **Form**: React Hook Form + Zod
- **i18n**: next-intl (12 lingue)
- **Grafici**: Recharts

### Infrastruttura
- **Containerizzazione**: Docker & Docker Compose
- **Monorepo**: npm workspaces
- **Reverse Proxy**: Nginx

## 🏗 Architettura

```
carrental/
├── apps/
│   ├── api/          # Backend NestJS
│   └── web/          # Frontend Next.js
├── docker/            # Dockerfiles e configurazioni
├── scripts/           # Script di deployment
└── package.json       # Root workspace config
```

### Moduli Backend Principali

- `auth` - Autenticazione e autorizzazione
- `bookings` - Gestione prenotazioni
- `vehicles` - Gestione veicoli
- `customers` - Gestione clienti
- `payments` - Pagamenti
- `cautions` - Depositi cauzionali
- `damages` - Gestione danni
- `maintenance` - Manutenzioni
- `analytics` - Analytics e report
- `subscription` - Gestione abbonamenti
- `public-bookings` - Marketplace pubblico

## 🚀 Setup Sviluppo

### Prerequisiti

- Node.js >= 20.0.0
- Docker & Docker Compose

### Setup con Docker (Consigliato)

1. **Clonare il repository**
   ```bash
   git clone <repository-url>
   cd carrental
   ```

2. **Avviare i servizi con Docker**
   ```bash
   docker-compose up -d
   ```
   
   Questo avvierà:
   - PostgreSQL (porta 5432)
   - Redis (porta 6379)
   - MinIO Storage (porta 9000, console 9001)
   - API Backend (porta 3000)
   - Frontend Web (porta 3001)

3. **Eseguire le migrazioni del database**
   ```bash
   docker exec -it api npx prisma migrate deploy
   docker exec -it api npx prisma db seed
   ```

4. **Creare utenti demo**
   ```bash
   docker exec -it api npx ts-node prisma/seed-demo-users.ts
   ```

**Credenziali Demo:**
| Tipo | Email | Password | URL |
|------|-------|----------|-----|
| SuperAdmin | superadmin@carrental.com | demo1234 | /superadmin/login |
| Business | business@carrental.com | demo1234 | /business/login |
| Customer | customer@carrental.com | demo1234 | /customer/login |

**Servizi disponibili:**
- Frontend: http://localhost:3001
- API: http://localhost:3000/api/v1
- API Docs: http://localhost:3000/api/docs
- MinIO Console: http://localhost:9001 (minioadmin/minioadmin)

### Setup Manuale (Alternativo)

1. **Installare dipendenze**
   ```bash
   npm install
   ```

2. **Configurare environment variables** (`.env`):
   ```env
   # Database
   POSTGRES_USER=carrental
   POSTGRES_PASSWORD=carrental123
   POSTGRES_DB=carrental
   DATABASE_URL=postgresql://carrental:carrental123@localhost:5432/carrental
   DIRECT_URL=postgresql://carrental:carrental123@localhost:5432/carrental

   # Redis
   REDIS_URL=redis://localhost:6379

   # JWT (minimo 16 caratteri)
   JWT_SECRET=your-super-secret-jwt-key-change-in-production

   # CORS
   CORS_ORIGIN=http://localhost:3001

   # MinIO Storage
   MINIO_ENDPOINT=localhost
   MINIO_PORT=9000
   MINIO_ACCESS_KEY=minioadmin
   MINIO_SECRET_KEY=minioadmin
   STORAGE_BUCKET=carrental

   # Frontend
   NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
   ```

3. **Setup database**
   ```bash
   cd apps/api
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed
   ```

4. **Avviare in sviluppo**
   ```bash
   npm run dev
   ```

## 📦 Deployment

### Produzione

1. **Build**
   ```bash
   npm run build
   ```

2. **Deploy con Docker**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Deploy manuale**
   ```bash
   ./scripts/deploy.sh
   ```

Vedi `scripts/deploy.sh` per dettagli completi.

## 📚 Documentazione

### API Documentation

- **Swagger UI**: `http://localhost:3000/api/docs`
- **OpenAPI Spec**: Disponibile su `/api/docs-json`

### Documentazione Aggiuntiva

- [Testing Guide](apps/api/README_TESTING.md) - Guida completa ai test
- [Audit Report](AUDIT_REPORT.md) - Analisi completa del progetto
- [Fixes Applied](FIXES_APPLIED.md) - Fix di sicurezza applicati
- [Completed Tasks](COMPLETED_TASKS.md) - Riepilogo task completati

## 🧪 Testing

### Backend

```bash
cd apps/api

# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

### Frontend

```bash
cd apps/web

npm test
npm run test:watch
```

Vedi [README_TESTING.md](apps/api/README_TESTING.md) per dettagli.

## 🔒 Sicurezza

### Best Practices Implementate

- ✅ Tenant isolation con validazione JWT
- ✅ CORS configurato correttamente (no wildcard)
- ✅ Security headers (Helmet.js)
- ✅ Rate limiting granulare
- ✅ Input validation (class-validator)
- ✅ SQL injection prevention (Prisma ORM)
- ✅ Password hashing (bcrypt)
- ✅ 2FA support (TOTP)
- ✅ Audit logging
- ✅ Sanitizzazione dati sensibili nei log

### Checklist Pre-Produzione

- [ ] Configurare `CORS_ORIGIN` con domini produzione
- [ ] Cambiare `JWT_SECRET` con valore sicuro
- [ ] Configurare backup automatizzato database
- [ ] Setup monitoring e alerting
- [ ] Configurare SSL/TLS
- [ ] Review environment variables
- [ ] Testare disaster recovery

## 📊 Performance

### Target Metriche

- API Response Time: <200ms (P95)
- Database Query Time: <100ms (P95)
- Page Load Time: <2s
- File Upload: <2s (per file 5MB)

### Ottimizzazioni Implementate

- ✅ Redis caching per user data
- ✅ Query batch per evitare N+1
- ✅ Indici compositi su database
- ✅ Connection pooling PostgreSQL
- ✅ Rate limiting per prevenire abusi

## 🤝 Contribuire

1. Fork il repository
2. Crea un branch per la feature (`git checkout -b feature/amazing-feature`)
3. Commit le modifiche (`git commit -m 'Add amazing feature'`)
4. Push al branch (`git push origin feature/amazing-feature`)
5. Apri una Pull Request

### Convenzioni

- Seguire le convenzioni di codice esistenti
- Aggiungere test per nuove funzionalità
- Documentare API con Swagger decorators
- Aggiornare CHANGELOG.md

## 📝 Licenza

[Specificare licenza]

## 👥 Team

[Informazioni team]

## 📞 Supporto

Per supporto, apri una issue su GitHub o contatta il team.

---

**Versione**: 1.0.0  
**Ultimo Aggiornamento**: ${new Date().toLocaleDateString('it-IT')}
