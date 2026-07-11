# FitOra Production Deployment Guide

Complete reference for deploying FitOra to production with Docker, NGINX, Cloudflare, AWS, monitoring, and security hardening.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Environment Variables](#environment-variables)
4. [Docker & Docker Compose](#docker--docker-compose)
5. [NGINX Reverse Proxy](#nginx-reverse-proxy)
6. [SSL & Cloudflare](#ssl--cloudflare)
7. [GitHub Actions CI/CD](#github-actions-cicd)
8. [AWS Deployment](#aws-deployment)
9. [Database Backups](#database-backups)
10. [Monitoring & Logging](#monitoring--logging)
11. [Error Tracking (Sentry)](#error-tracking-sentry)
12. [Security Checklist](#security-checklist)
13. [Performance Optimization](#performance-optimization)
14. [Runbook](#runbook)

**Dashboard API reference:** see [API.md](./API.md) for list endpoints, owner analytics, and React Query integration.

---

## Architecture Overview

```
                    ┌─────────────┐
                    │  Cloudflare │  DNS, WAF, CDN, DDoS
                    └──────┬──────┘
                           │ HTTPS
                    ┌──────▼──────┐
                    │    NGINX    │  Reverse proxy, rate limits, TLS
                    └──┬───┬───┬──┘
           ┌───────────┘   │   └───────────┐
      ┌────▼────┐    ┌─────▼─────┐   ┌─────▼─────┐
      │   Web   │    │    API    │   │   Admin   │
      │  :3000  │    │   :3001   │   │   :3002   │
      └─────────┘    └─────┬─────┘   └───────────┘
                           │
              ┌────────────┼────────────┐
         ┌────▼────┐  ┌────▼────┐
         │ Postgres│  │  Redis  │
         │  :5432  │  │  :6379  │
         └─────────┘  └─────────┘
```

**Domains (example):**

| Service | URL |
|---------|-----|
| Web app | `https://fitora.com` |
| Admin | `https://admin.fitora.com` |
| API | `https://api.fitora.com/api/v1` |

---

## Prerequisites

- **Server:** 4 GB RAM minimum (8 GB recommended), 2 vCPU
- **OS:** Ubuntu 22.04+ or Amazon Linux 2023
- **Software:** Docker 24+, Docker Compose v2, Git
- **DNS:** Cloudflare or Route 53
- **Secrets:** Strong JWT keys (64+ chars), unique DB password
- **External services:** Razorpay live keys, SendGrid, MSG91 (as needed)

---

## Environment Variables

Copy the production template:

```bash
cp .env.production.example .env.production
# Edit all CHANGE_ME values
```

### Required variables

| Variable | Description |
|----------|-------------|
| `POSTGRES_PASSWORD` | Strong database password |
| `JWT_SECRET` | 64+ char random string |
| `JWT_REFRESH_SECRET` | Separate 64+ char random string |
| `CORS_ORIGINS` | `https://fitora.com,https://admin.fitora.com` |
| `NEXT_PUBLIC_API_URL` | `https://api.fitora.com/api/v1` |
| `PAYMENT_MODE` | `live` for production |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Live Razorpay credentials |
| `SWAGGER_ENABLED` | `false` in production |

### Notification modes

Set `OTP_MODE`, `EMAIL_MODE`, `SMS_MODE`, `PUSH_MODE` to `live` and configure provider keys.

See [`.env.production.example`](../.env.production.example) and [`apps/api/.env.example`](../apps/api/.env.example) for the full list.

**Never commit `.env.production` to git.** Use AWS Secrets Manager or GitHub Actions secrets for CI/CD.

---

## Docker & Docker Compose

### Build images locally

```bash
pnpm docker:build
```

### Start production stack

```bash
cp .env.production.example .env.production
# Place SSL certs in infra/nginx/ssl/ (see infra/nginx/ssl/README.md)

pnpm docker:prod
```

### Services

| Container | Image | Internal port |
|-----------|-------|---------------|
| `fitora-nginx` | nginx:1.27-alpine | 80, 443 |
| `fitora-api` | Built from `apps/api/Dockerfile` | 3001 |
| `fitora-web` | Built from `apps/web/Dockerfile` | 3000 |
| `fitora-admin` | Built from `apps/admin/Dockerfile` | 3002 |
| `fitora-postgres` | postgres:16-alpine | 5432 |
| `fitora-redis` | redis:7-alpine | 6379 |

### API container behavior

- Runs `prisma migrate deploy` (or `db push` if no migrations) on startup
- Readiness probe: `GET /api/v1/health/ready` (checks database)
- Liveness probe: `GET /api/v1/health`

### Useful commands

```bash
pnpm docker:prod          # Start all services
pnpm docker:prod:down     # Stop all services
pnpm docker:backup        # Run one-off DB backup
docker compose -f docker-compose.prod.yml logs -f api
```

---

## NGINX Reverse Proxy

Configuration: [`infra/nginx/`](../infra/nginx/)

- **Rate limiting:** 30 req/s API, 50 req/s web
- **Gzip** enabled for JSON/JS/CSS
- **Security headers:** HSTS, X-Frame-Options, nosniff
- **Cloudflare real IP** restoration via `CF-Connecting-IP`
- **Upstream keepalive** for API performance

Reload after config changes:

```bash
docker exec fitora-nginx nginx -t && docker exec fitora-nginx nginx -s reload
```

---

## SSL & Cloudflare

### Recommended: Cloudflare Full (Strict)

1. Add domain to Cloudflare, update nameservers
2. Create **Origin Certificate** (SSL/TLS → Origin Server)
3. Save to `infra/nginx/ssl/fullchain.pem` and `privkey.pem`
4. Set SSL mode to **Full (strict)**
5. Enable **Always Use HTTPS**, **HSTS**, **Minimum TLS 1.2**

### DNS records

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `@` | Server IP | Proxied |
| A | `www` | Server IP | Proxied |
| A | `api` | Server IP | Proxied |
| A | `admin` | Server IP | Proxied |

### Cloudflare WAF rules (recommended)

- Challenge requests from high-risk countries (optional)
- Block `/api/docs` in production (Swagger disabled anyway)
- Rate limit `/api/v1/auth/login` — 10 req/min per IP

### HTTP-only origin (alternative)

Use [`infra/nginx/conf.d/fitora-cloudflare-origin.conf.example`](../infra/nginx/conf.d/fitora-cloudflare-origin.conf.example) when Cloudflare terminates TLS at the edge.

---

## GitHub Actions CI/CD

### Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| [`ci.yml`](../.github/workflows/ci.yml) | PR + push to main/develop | Lint, test, build, Docker verify |
| [`deploy.yml`](../.github/workflows/deploy.yml) | Push to main, tags `v*` | Build, push GHCR, optional ECS deploy |

### GHCR images

After push to `main`:

```
ghcr.io/<org>/fitora-api:latest
ghcr.io/<org>/fitora-web:latest
ghcr.io/<org>/fitora-admin:latest
```

### Enable AWS ECS deploy

Set repository variables:

| Variable | Example |
|----------|---------|
| `AWS_DEPLOY_ENABLED` | `true` |
| `AWS_REGION` | `ap-south-1` |
| `ECS_CLUSTER` | `fitora-prod` |
| `NEXT_PUBLIC_API_URL` | `https://api.fitora.com/api/v1` |
| `SMOKE_TEST_URL` | `https://api.fitora.com` |

Set secrets:

| Secret | Description |
|--------|-------------|
| `AWS_DEPLOY_ROLE_ARN` | IAM role for OIDC deploy |

### Release process

```bash
git tag v1.0.0
git push origin v1.0.0
# deploy.yml builds and pushes tagged images
```

---

## AWS Deployment

See [`infra/aws/README.md`](../infra/aws/README.md) for full details.

### Recommended AWS architecture

| Layer | Service |
|-------|---------|
| Compute | ECS Fargate or EC2 + Docker Compose |
| Database | RDS PostgreSQL 16 (Multi-AZ) |
| Cache | ElastiCache Redis 7 |
| Load balancer | ALB with ACM certificate |
| Secrets | AWS Secrets Manager |
| Logs | CloudWatch Logs |
| Backups | RDS automated + S3 via `backup-db.sh` |
| Container registry | ECR |

### ECS task definition

Template: [`infra/aws/ecs-task-definition.json`](../infra/aws/ecs-task-definition.json)

### EC2 quick start

```bash
# On EC2 instance
git clone https://github.com/your-org/fitora.git
cd fitora
cp .env.production.example .env.production
# Point DATABASE_URL to RDS, REDIS_URL to ElastiCache
pnpm docker:prod
```

---

## Database Backups

### Automated daily backup

```bash
# Enable backup sidecar (runs daily)
docker compose -f docker-compose.prod.yml --profile backup up -d backup
```

### Manual backup

```bash
pnpm docker:backup
# Or directly:
docker compose -f docker-compose.prod.yml exec postgres \
  sh /scripts/backup-db.sh
```

Backups stored in `infra/backups/fitora_YYYYMMDD_HHMMSS.sql.gz`

### S3 upload

Set in `.env.production`:

```
AWS_S3_BACKUP_BUCKET=fitora-prod-backups
```

Requires AWS CLI credentials on the host or IAM role.

### Restore

```bash
./infra/scripts/restore-db.sh infra/backups/fitora_20260706_120000.sql.gz
```

### RDS

Enable automated backups (7–35 day retention), point-in-time recovery, and cross-region snapshots for disaster recovery.

---

## Monitoring & Logging

### Health endpoints

| Endpoint | Use |
|----------|-----|
| `GET /api/v1/health` | Liveness (process up) |
| `GET /api/v1/health/ready` | Readiness (DB connected) |

Configure ALB/NGINX/UptimeRobot to poll `/health/ready` every 60s.

### Docker logs

```bash
docker compose -f docker-compose.prod.yml logs -f --tail=100 api
```

Log rotation configured: 50 MB × 5 files for API.

### Prometheus + Grafana (optional)

```bash
docker compose -f docker-compose.prod.yml \
  -f infra/monitoring/docker-compose.monitoring.yml \
  --profile monitoring up -d
```

- Prometheus: `http://server:9090`
- Grafana: `http://server:3003` (set `GRAFANA_ADMIN_PASSWORD`)

### CloudWatch (AWS)

ECS task definition ships logs to `/ecs/fitora-api`. Create alarms for:

- 5xx error rate on ALB
- ECS CPU/memory utilization
- RDS storage and connections

### Uptime monitoring

Use Cloudflare Health Checks, UptimeRobot, or Better Stack to monitor:

- `https://api.fitora.com/api/v1/health/ready`
- `https://fitora.com`
- `https://admin.fitora.com`

---

## Error Tracking (Sentry)

1. Create project at [sentry.io](https://sentry.io)
2. Install SDK (optional — lazy-loaded):

```bash
pnpm --filter @fitora/api add @sentry/nestjs @sentry/profiling-node
```

3. Set environment variables:

```
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

Sentry initializes automatically when `SENTRY_DSN` is set (`apps/api/src/instrumentation.ts`).

---

## Security Checklist

### Before go-live

- [ ] Change all default passwords and JWT secrets
- [ ] Set `SWAGGER_ENABLED=false`
- [ ] Set `PAYMENT_MODE=live` with live Razorpay keys
- [ ] Configure `CORS_ORIGINS` to production domains only
- [ ] Enable Cloudflare WAF and bot protection
- [ ] Use Cloudflare Full (strict) SSL
- [ ] Do not expose Postgres/Redis ports publicly
- [ ] Restrict admin access (VPN IP allowlist in NGINX optional)
- [ ] Store secrets in Secrets Manager, not in git
- [ ] Enable RDS encryption at rest
- [ ] Configure Razorpay webhook signature verification
- [ ] Review RBAC permissions for admin users
- [ ] Enable GitHub branch protection on `main`
- [ ] Set up database backups and test restore
- [ ] Configure Sentry or error alerting
- [ ] Disable `RUN_SEED` in production
- [ ] Audit `.env.production` — no dev/mock modes

### API hardening (built-in)

- JWT + refresh token rotation (refresh tokens stored as SHA-256 hashes)
- RBAC with permissions guard
- **Helmet** security headers
- **Redis-backed global rate limiting** (100 req/min/IP, configurable)
- **Auth route rate limiting** (10 req/min/IP via Redis)
- **Zod env validation** on startup — fails fast on misconfiguration
- **Global exception filter** with Prisma error mapping and request IDs
- **Request logging** with structured JSON and `X-Request-Id`
- **CSRF / origin protection** for mutating requests in production
- **Razorpay webhook signature** — rejects unsigned/invalid webhooks
- **Audit logging** for auth events and API mutations
- Validation pipe with whitelist + forbid unknown fields
- `trust proxy` enabled behind NGINX
- Non-root Docker users

See [SECURITY.md](./SECURITY.md) for full security documentation.

### Ongoing

- [ ] Rotate JWT secrets quarterly
- [ ] Update dependencies monthly (`pnpm update`)
- [ ] Review CloudWatch/Sentry alerts weekly
- [ ] Test backup restore quarterly
- [ ] Penetration test before major releases

---

## Performance Optimization

### NGINX

- Gzip compression enabled
- Upstream keepalive connections
- Rate limiting prevents abuse

### API

- Prisma connection pooling (use RDS Proxy at scale)
- Redis for future session/cache (infrastructure ready)
- `trust proxy` for correct client IPs behind Cloudflare

### Next.js (web/admin)

- `output: 'standalone'` for minimal Docker images
- Static assets cached by Cloudflare CDN
- Build-time env vars baked into client bundle

### Database

- RDS instance: `db.t3.medium` minimum for production
- Enable `pg_stat_statements` for slow query analysis
- Index review on high-traffic tables (bookings, payments)

### Cloudflare

- Enable caching for static assets (`/_next/static/*`)
- Brotli compression
- HTTP/3 (QUIC)
- Argo Smart Routing (optional)

### Scaling path

1. **Vertical:** Increase EC2/RDS instance size
2. **Horizontal API:** ECS service auto-scaling (CPU > 70%)
3. **Read replicas:** RDS read replica for analytics
4. **CDN:** CloudFront for web/admin static assets
5. **Queue:** Add Bull/BullMQ on Redis for async notifications

---

## Runbook

### Deploy new version

```bash
git pull origin main
pnpm docker:build
pnpm docker:prod
docker compose -f docker-compose.prod.yml ps
curl -fsSL https://api.fitora.com/api/v1/health/ready
```

### Rollback

```bash
# Pin to previous image tag
export IMAGE_TAG=<previous-sha>
docker compose -f docker-compose.prod.yml up -d api web admin
```

### Database migration failed

```bash
docker compose -f docker-compose.prod.yml logs api
# Fix schema, then:
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

### High CPU on API

```bash
docker stats fitora-api
docker compose -f docker-compose.prod.yml logs --tail=500 api | grep ERROR
```

### SSL certificate renewal

```bash
certbot renew
cp /etc/letsencrypt/live/fitora.com/*.pem infra/nginx/ssl/
docker exec fitora-nginx nginx -s reload
```

---

## File Reference

| Path | Purpose |
|------|---------|
| `docker-compose.prod.yml` | Production stack |
| `apps/api/Dockerfile` | API container |
| `apps/web/Dockerfile` | Web container |
| `apps/admin/Dockerfile` | Admin container |
| `infra/nginx/` | NGINX configuration |
| `infra/scripts/backup-db.sh` | Database backup |
| `infra/aws/` | ECS task definition, AWS guide |
| `infra/monitoring/` | Prometheus + Grafana |
| `.env.production.example` | Production env template |
| `.github/workflows/deploy.yml` | CI/CD deploy pipeline |

---

## Support

For issues during deployment, check:

1. `docker compose logs <service>`
2. API readiness: `/api/v1/health/ready`
3. NGINX config test: `nginx -t`
4. Cloudflare SSL mode matches origin setup
