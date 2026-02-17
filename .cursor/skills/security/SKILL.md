---
name: security
description: Sicurezza, autenticazione JWT, RBAC e best practices security per Car Rental. Usa quando implementi autenticazione, autorizzazione, ruoli utente, 2FA, o audit logging.
---

# Security — Car Rental

## Autenticazione JWT

```typescript
// Payload JWT
{
  sub: userId,
  email: userEmail,
  role: { id, name },
  tenantId: tenantId,
}

// Guard su ogni controller protetto
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionRequiredGuard)

// Endpoint pubblici (bypass JWT)
@Public()
```

## RBAC — Ruoli

```typescript
// Decoratore su ogni endpoint
@Roles('ADMIN', 'MANAGER')           // uno dei due
@Roles('ADMIN', 'MANAGER', 'OPERATOR') // uno dei tre

// Gerarchia tipica
ADMIN    → accesso completo
MANAGER  → gestione operativa (no settings critici)
OPERATOR → operazioni base (no delete, no impostazioni)
VIEWER   → sola lettura
```

## 2FA (Two-Factor Authentication)

Implementato con `speakeasy` (TOTP):

```typescript
// Attivazione 2FA
await this.auth.enable2FA(userId)   // restituisce QR code + secret
await this.auth.verify2FA(userId, token) // verifica primo token

// Login con 2FA attivo
// 1° step: POST /auth/login → { requires2FA: true, tempToken }
// 2° step: POST /auth/2fa/verify → { accessToken }

// Backup codes (10 codici usa-e-getta)
await this.auth.generateBackupCodes(userId)
await this.auth.useBackupCode(userId, backupCode)
```

## Password

```typescript
// Hashing con bcrypt (saltRounds: 12)
const hash = await bcrypt.hash(password, 12);
const valid = await bcrypt.compare(password, hash);

// Reset password
// 1. POST /auth/forgot-password → invia email con token
// 2. POST /auth/reset-password → { token, newPassword }
```

## Audit logging

**Obbligatorio** per tutte le operazioni CRUD sensibili:

```typescript
await this.audit.log(
  tenantId,           // string
  'CREATE',           // action: CREATE | UPDATE | DELETE | LOGIN | ...
  'Vehicle',          // resource type
  vehicle.id,         // resource ID
  userId,             // chi ha fatto l'azione
  undefined,          // oldValue (per UPDATE)
  { licensePlate },   // newValue (per UPDATE/CREATE)
);
```

## Helmet & CORS

Configurati in `main.ts`:
```typescript
app.use(helmet());
app.enableCors({ origin: process.env.CORS_ORIGIN });
```

## Secrets

- **Mai** loggare password, token JWT, API keys
- **Mai** committare `.env` in git
- `EncryptionService` disponibile per dati sensibili nel DB
