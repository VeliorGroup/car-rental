# Changelog

Tutte le modifiche notevoli a questo progetto saranno documentate in questo file.

Il formato è basato su [Keep a Changelog](https://keepachangelog.com/it/1.0.0/),
e questo progetto aderisce a [Semantic Versioning](https://semver.org/lang/it/).

## [1.1.0] - ${new Date().toLocaleDateString('it-IT')}

### 🔒 Sicurezza
- **CRITICO**: Fix tenant isolation - tenantId ora estratto da JWT invece che header
- **CRITICO**: Rimosso CORS wildcard default, validazione origins obbligatoria
- **MEDIO**: Implementato Helmet.js per security headers HTTP
- **MEDIO**: Sanitizzazione dati sensibili nei log (password, token, API keys)
- **MEDIO**: Verifica esplicita token expiration nel SuperAdmin guard
- **BASSO**: Validazione environment variables all'avvio

### ⚡ Performance
- **MEDIO**: Implementato caching Redis per JWT user data (TTL: 5 min)
- **MEDIO**: Configurato connection pool PostgreSQL (max: 20, timeout: 10s)
- **MEDIO**: Slow query detection e logging (>1s)
- **BASSO**: Cache invalidation strategy con namespace tenant

### 🧪 Testing
- **ALTO**: Creato test suite base con Jest
- **ALTO**: Test unitari per componenti critici:
  - TenantMiddleware
  - JwtStrategy  
  - AdminAuthGuard
  - ThrottleCustomGuard
  - BookingsService
  - AuthService
  - EnvSchema
  - RedisCacheService
  - Sanitize utilities
- **MEDIO**: Configurazione Jest completa
- **MEDIO**: Documentazione testing

### 📝 Code Quality
- **MEDIO**: Estratte costanti centralizzate (magic numbers/strings)
- **MEDIO**: Rate limiting granulare per endpoint critici
- **BASSO**: Migliorato error handling con sanitizzazione
- **BASSO**: Migliorato logging con sanitizzazione URL e messaggi

### 🚀 DevOps
- **ALTO**: Creato GitHub Actions CI/CD pipeline
- **ALTO**: Script backup database automatizzato
- **MEDIO**: Security scanning integrato (npm audit, Snyk)
- **BASSO**: Documentazione deployment migliorata

### 📚 Documentazione
- **ALTO**: Creato README.md principale completo
- **MEDIO**: Documentazione setup sviluppo
- **MEDIO**: Documentazione testing
- **MEDIO**: Documentazione sicurezza
- **BASSO**: Guide deployment

### 🔧 Miglioramenti Tecnici
- Aggiunto `@nestjs/helmet` per security headers
- Creato `sanitize.util.ts` per sanitizzazione dati sensibili
- Creato `app.constants.ts` per costanti centralizzate
- Creato `cache-invalidation.util.ts` per gestione cache
- Migliorato `PrismaService` con connection pooling e slow query detection
- Aggiornato `AllExceptionsFilter` con sanitizzazione errori
- Aggiornato `LoggingInterceptor` con sanitizzazione URL

### 🐛 Bug Fixes
- Fix tenant isolation bypass vulnerability
- Fix CORS wildcard security issue
- Fix SuperAdmin guard token expiration check
- Fix error messages esposti in produzione

### 📦 Dipendenze
- Aggiunto: `@nestjs/helmet@^4.0.2`

---

## [1.0.0] - Release Iniziale

### Aggiunto
- Architettura multi-tenant completa
- Sistema di autenticazione con JWT e 2FA
- Gestione completa veicoli, prenotazioni, clienti
- Sistema di pagamenti (Paysera, Stripe)
- Marketplace pubblico
- Sistema di abbonamenti
- Analytics e reporting
- Supporto i18n (12 lingue)
- Docker e Docker Compose setup

---

## Tipi di Modifiche

- **Aggiunto** per nuove funzionalità
- **Modificato** per modifiche a funzionalità esistenti
- **Deprecato** per funzionalità che verranno rimosse
- **Rimosso** per funzionalità rimosse
- **Corretto** per correzioni di bug
- **Sicurezza** per vulnerabilità
