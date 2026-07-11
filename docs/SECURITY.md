# FitOra API Security

Security controls implemented in the NestJS API and operational guidance for production.

---

## Authentication & Sessions

- **JWT access tokens** (short-lived, default 15m) with separate refresh secret
- **Refresh tokens** stored as SHA-256 hashes — raw tokens never persisted
- **Refresh rotation** — old token revoked on each refresh
- **Global JWT guard** with `@Public()` opt-out
- **RBAC** via `RolesGuard` and `PermissionsGuard`
- **bcrypt** password hashing (12 rounds)
- **OTP / reset tokens** stored hashed

## Transport & Headers

- **Helmet** — security headers (CSP disabled in dev for Swagger)
- **HSTS** — enforced at NGINX layer in production
- **CORS** — explicit origin allowlist; rejects unknown origins
- **Request IDs** — `X-Request-Id` on every request/response

## Rate Limiting

- **Global** — Redis-backed (100 req/min/IP default, configurable)
- **Auth routes** — stricter limit (10 req/min/IP)
- In-memory fallback in development when Redis is unavailable

## CSRF / Origin Protection

The API uses Bearer JWT (not cookie sessions). CSRF protection:

- **Production mutating requests** — Origin/Referer validated against `CORS_ORIGINS`
- **Webhooks & health** — excluded from origin checks
- **Non-browser clients** — must send `Authorization: Bearer` when Origin is absent

## Input Validation

- Global `ValidationPipe`: whitelist, forbid unknown fields, transform
- DTOs use `class-validator` on all endpoints
- Password complexity enforced on register and login

## Payment Security

- **Razorpay webhooks** — HMAC-SHA256 signature required when `RAZORPAY_WEBHOOK_SECRET` is set
- **Missing signature rejected** — unsigned webhooks never processed in live mode
- **Raw body verification** — signature computed on raw request body (not re-serialized JSON)
- **Client verify** — `timingSafeEqual` for payment signature comparison

## SQL Injection

- **Prisma ORM** — all queries use parameterized statements
- **Raw SQL** — only `$queryRaw` tagged template in health check (`SELECT 1`)
- **No string concatenation** in queries — review required before adding `$queryRawUnsafe`

## XSS

- API returns JSON only — no HTML rendering
- User-generated content (court names, descriptions) must be escaped on **frontend** display
- `Content-Type: application/json` enforced by NestJS

## Environment Validation

- **Zod schema** validates all env vars on startup (`ConfigModule.validate`)
- Production requires: 32+ char JWT secrets, Redis URL, no mock notification modes
- Live payments require Razorpay keys + webhook secret

## Audit Logging

- **Auth events** — login, logout, failed attempts (IP + user agent)
- **API mutations** — POST/PUT/PATCH/DELETE logged to `audit_logs` table
- Structured HTTP request logging with request ID, duration, status

## Error Handling

- **Global exception filter** — consistent JSON error shape with `requestId`
- **Prisma errors mapped** — P2002 → 409, P2025 → 404
- Stack traces never exposed to clients in production

## Checklist for Production

- [ ] Set strong JWT secrets (64+ random chars)
- [ ] Set `SWAGGER_ENABLED=false`
- [ ] Set `OTP_MODE=live`, `EMAIL_MODE=live`, `SMS_MODE=live`
- [ ] Configure `RAZORPAY_WEBHOOK_SECRET` and verify webhook URL
- [ ] Enable Redis with password/TLS
- [ ] Restrict `CORS_ORIGINS` to production domains only
- [ ] Run Prisma migrations (`pnpm db:migrate:deploy`)
- [ ] Install Sentry packages and set `SENTRY_DSN`
- [ ] Review Cloudflare WAF rules

See also: [DEPLOYMENT.md](./DEPLOYMENT.md)
