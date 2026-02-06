# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Security Features

### Authentication & Authorization

- **JWT Tokens**: Secure token-based authentication with configurable expiration
- **Two-Factor Authentication (2FA)**: TOTP-based 2FA for enhanced security
- **Role-Based Access Control (RBAC)**: Fine-grained permissions (ADMIN, MANAGER, OPERATOR)
- **Multi-Tenant Isolation**: Complete data isolation between tenants

### Data Protection

- **Password Hashing**: bcrypt with configurable salt rounds
- **Encryption at Rest**: Sensitive data encryption using AES-256
- **Input Validation**: Class-validator and Zod schema validation
- **SQL Injection Prevention**: Prisma ORM with parameterized queries

### API Security

- **Rate Limiting**: Configurable per-endpoint rate limits
- **CORS**: Strict origin validation (no wildcards in production)
- **Helmet.js**: Security headers (CSP, HSTS, X-Frame-Options, etc.)
- **Request Sanitization**: XSS prevention through input sanitization

### Session Security

- **Token Refresh**: Automatic token refresh mechanism
- **Session Invalidation**: Logout invalidates all active sessions
- **IP-based Restrictions**: Optional IP allowlisting

## Security Best Practices

### Environment Variables

```bash
# NEVER commit these to version control
JWT_SECRET=use-256-bit-random-key
DATABASE_URL=use-ssl-connection
```

### Production Checklist

- [ ] Change all default passwords
- [ ] Enable HTTPS only
- [ ] Set secure CORS origins
- [ ] Configure proper rate limits
- [ ] Enable 2FA for admin accounts
- [ ] Set up monitoring and alerting
- [ ] Regular security audits
- [ ] Keep dependencies updated

## Reporting a Vulnerability

If you discover a security vulnerability, please:

1. **DO NOT** create a public GitHub issue
2. Email security concerns to: security@yourdomain.com
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 24 hours
- **Initial Assessment**: Within 72 hours
- **Resolution**: Based on severity (Critical: 7 days, High: 14 days, Medium: 30 days)

## Security Audit History

| Date | Auditor | Findings | Status |
|------|---------|----------|--------|
| 2024-01 | Internal | Multi-tenant security review | ✅ Resolved |
| 2024-06 | Internal | API security hardening | ✅ Resolved |

## Dependencies Security

We use:
- `npm audit` for dependency scanning
- Automated Dependabot alerts
- Regular dependency updates

## Compliance

This platform is designed to support:
- GDPR (Data protection)
- PCI-DSS (Payment card industry) - when using Stripe/Paysera

## Contact

For security-related inquiries:
- Email: security@yourdomain.com
- Response SLA: 24 hours
