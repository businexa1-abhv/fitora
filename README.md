# FitOra

**Production-ready Turborepo monorepo** for the FitOra sports & fitness platform.

Book courts, manage memberships, enroll kids in training, shop gear, and book sports services — all in one platform.

## Enterprise Scaffold (Single Monorepo)

The repository now includes an enterprise architecture scaffold for the expanded multi-surface SaaS model:

- Mobile apps: `apps/player-app`, `apps/owner-app`
- Web apps: `apps/admin-web`, `apps/partner-web`, `apps/shop-partner-web`
- Shared packages: `packages/design-system`, `packages/api`, `packages/auth`, `packages/hooks`, `packages/utils`, `packages/validation`, `packages/theme`, `packages/constants`
- Backend services: `backend/services/*`
- Backend shared modules: `backend/shared/*`

Architecture and platform design docs:

- `docs/enterprise/MONOREPO_ENTERPRISE_ARCHITECTURE.md`
- `docs/enterprise/API_COMMUNICATION_FLOW.md`
- `docs/enterprise/AUTH_AND_NAVIGATION_FLOW.md`
- `docs/enterprise/CI_CD_PIPELINE.md`
- `docs/enterprise/ENVIRONMENT_CONFIGURATION.md`
- `docs/enterprise/DEVELOPMENT_SCRIPTS.md`

---

## Monorepo Structure

```
fitora/
├── apps/
│   ├── api/              # NestJS REST API          → :3001
│   ├── web/              # Next.js player app       → :3000
│   ├── admin/            # Next.js admin dashboard  → :3002
│   └── mobile/           # Expo React Native app
├── packages/
│   ├── config/           # Shared ESLint, Prettier, TypeScript configs
│   ├── types/            # Shared TypeScript types & enums
│   ├── shared/           # Shared utilities & re-exports
│   └── ui/               # Shared React UI components
├── docs/
│   ├── PRD.md
│   └── Architecture.md
├── .github/workflows/    # CI/CD pipelines
├── .husky/               # Git hooks (pre-commit, commit-msg)
├── docker-compose.yml    # Local PostgreSQL + Redis
├── turbo.json            # Turborepo task pipeline
└── pnpm-workspace.yaml
```

---

## Tech Stack

| Layer           | Technology                                                   |
| --------------- | ------------------------------------------------------------ |
| **Monorepo**    | Turborepo + pnpm workspaces                                  |
| **API**         | NestJS 11, Prisma 6, PostgreSQL 16                           |
| **Web / Admin** | Next.js 15, React 19, Tailwind CSS 4                         |
| **Mobile**      | Expo 52, React Native, Expo Router                           |
| **Cache**       | Redis 7                                                      |
| **Payments**    | Razorpay (mock mode for local dev)                           |
| **API Docs**    | Swagger UI at `/api/docs`                                    |
| **Tooling**     | TypeScript, ESLint, Prettier, Husky, lint-staged, Commitlint |

---

## Prerequisites

- **Node.js** 20+
- **pnpm** 10+ (`corepack enable && corepack prepare pnpm@latest --activate`)
- **Docker** & Docker Compose (PostgreSQL + Redis)
- **Expo Go** app (optional, for mobile development)

---

## Quick Start

### 1. Clone & install

```bash
git clone <repo-url> fitora
cd fitora
pnpm install
```

Husky git hooks are installed automatically via the `prepare` script.

### 2. Start infrastructure

```bash
pnpm docker:up
# or: docker compose up -d
```

### 3. Configure environment

```bash
cp .env.example .env                          # reference only
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local
cp apps/mobile/.env.example apps/mobile/.env
```

### 4. Set up database

```bash
pnpm db:generate
pnpm db:push
pnpm db:seed
```

### 5. Run all apps

```bash
pnpm dev
```

| App     | URL                               |
| ------- | --------------------------------- |
| Web     | http://localhost:3000             |
| API     | http://localhost:3001             |
| Swagger | http://localhost:3001/api/docs    |
| Admin   | http://localhost:3002             |
| Mobile  | `pnpm dev:mobile` → Expo DevTools |

---

## Scripts

| Command             | Description                   |
| ------------------- | ----------------------------- |
| `pnpm dev`          | Start all apps in development |
| `pnpm dev:api`      | API only                      |
| `pnpm dev:web`      | Web only                      |
| `pnpm dev:admin`    | Admin only                    |
| `pnpm dev:mobile`   | Expo mobile app               |
| `pnpm build`        | Build all apps & packages     |
| `pnpm lint`         | ESLint across monorepo        |
| `pnpm lint:fix`     | ESLint with auto-fix          |
| `pnpm typecheck`    | TypeScript check all packages |
| `pnpm format`       | Prettier write                |
| `pnpm format:check` | Prettier check (CI)           |
| `pnpm clean`        | Remove build artifacts        |
| `pnpm docker:up`    | Start PostgreSQL + Redis      |
| `pnpm docker:down`  | Stop containers               |
| `pnpm docker:build` | Build API Docker image        |
| `pnpm db:generate`  | Generate Prisma client        |
| `pnpm db:push`      | Push schema to database       |
| `pnpm db:migrate`   | Run migrations                |
| `pnpm db:seed`      | Seed demo data                |
| `pnpm db:studio`    | Open Prisma Studio            |

---

## Packages

### `@fitora/config`

Shared configuration consumed by all apps:

```
packages/config/
├── eslint/          base, nest, next, react-native
├── typescript/      base, nextjs, nestjs, react-native
└── prettier.config.mjs
```

Usage:

```json
// tsconfig.json
{ "extends": "@fitora/config/typescript/nextjs.json" }
```

```js
// eslint.config.mjs
import nextConfig from '@fitora/config/eslint/next';
export default nextConfig;
```

### `@fitora/types`

All shared TypeScript enums, interfaces, and label maps.

### `@fitora/shared`

Runtime utilities + re-exports from `@fitora/types`.

### `@fitora/ui`

Shared React components (`Button`, `Input`, `Card`) for web and admin.

---

## Environment Variables

See [`.env.example`](.env.example) for the full reference.

| App    | File                    | Key variables                                           |
| ------ | ----------------------- | ------------------------------------------------------- |
| API    | `apps/api/.env`         | `DATABASE_URL`, `JWT_SECRET`, `RAZORPAY_*`, `REDIS_URL` |
| Web    | `apps/web/.env.local`   | `NEXT_PUBLIC_API_URL`                                   |
| Admin  | `apps/admin/.env.local` | `NEXT_PUBLIC_API_URL`                                   |
| Mobile | `apps/mobile/.env`      | `EXPO_PUBLIC_API_URL`                                   |

**Payments:** Set `PAYMENT_MODE=mock` in `apps/api/.env` for local dev without Razorpay keys.

---

## Docker

### Local development (database only)

```bash
docker compose up -d
```

Starts PostgreSQL on port **5440** and Redis on **6379**.

### Production stack

Full production deployment (NGINX, API, web, admin, PostgreSQL, Redis):

```bash
cp .env.production.example .env.production
# Edit secrets, domains, and TLS paths — see docs/DEPLOYMENT.md

pnpm docker:prod          # build & start
pnpm docker:backup        # manual PostgreSQL backup
pnpm docker:prod:down     # stop stack
```

Optional monitoring (Prometheus + Grafana) after the prod stack is running:

```bash
docker compose -f infra/monitoring/docker-compose.monitoring.yml up -d
```

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for Docker, NGINX, Cloudflare, AWS ECS, SSL, backups, monitoring, logging, Sentry, security, and performance.

---

## Swagger API Documentation

Once the API is running:

**http://localhost:3001/api/docs**

Features:

- All modules tagged (auth, courts, shop, marketplace, payments, …)
- Bearer JWT auth with persistent authorization
- Request duration display
- Disable in production: `SWAGGER_ENABLED=false`

---

## Git Hooks & Commit Convention

### Husky

| Hook         | Action                                               |
| ------------ | ---------------------------------------------------- |
| `pre-commit` | Runs lint-staged (ESLint + Prettier on staged files) |
| `commit-msg` | Validates commit message via Commitlint              |

### Commit message format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(web): add court booking calendar
fix(api): prevent double slot booking
docs: update architecture diagram
chore(ci): add docker build step
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

---

## CI/CD (GitHub Actions)

| Workflow   | File                                                           | Purpose                                              |
| ---------- | -------------------------------------------------------------- | ---------------------------------------------------- |
| **CI**     | [`.github/workflows/ci.yml`](.github/workflows/ci.yml)         | Lint, typecheck, build, tests on every push/PR       |
| **Deploy** | [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) | Build & push images to GHCR; optional AWS ECS deploy |

### CI jobs

| Job                  | Runs on       | Steps                                                                        |
| -------------------- | ------------- | ---------------------------------------------------------------------------- |
| **Lint & Typecheck** | Every push/PR | install → prisma generate → build packages → lint → typecheck → format check |
| **Build Apps**       | After lint    | Full monorepo build                                                          |
| **Tests**            | After build   | API unit/integration tests with coverage floor                               |
| **Commitlint**       | PRs only      | Validates all commits in PR                                                  |
| **Docker Build**     | `main` branch | Builds production Docker images (no push)                                    |

Enable ECS deployment by setting repository variable `AWS_DEPLOY_ENABLED=true` and AWS/GitHub secrets — details in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Roles

| Role               | Description                             |
| ------------------ | --------------------------------------- |
| `ADMIN`            | Platform-wide administration            |
| `COURT_OWNER`      | Manages courts, slots, memberships      |
| `TRAINER`          | Kids training, attendance               |
| `PLAYER`           | Books courts, buys memberships, shops   |
| `SERVICE_PROVIDER` | Sports services (stringing, bat repair) |
| `PRINTER`          | Custom t-shirt printing                 |

---

## Seeded Accounts

```bash
pnpm db:seed
```

| Email                 | Password           | Role             |
| --------------------- | ------------------ | ---------------- |
| `admin@fitora.com`    | `AdminPass123!`    | Admin            |
| `trainer@fitora.com`  | `TrainerPass123!`  | Trainer          |
| `provider@fitora.com` | `ProviderPass123!` | Service Provider |
| `printer@fitora.com`  | `PrinterPass123!`  | Printer          |

---

## Documentation

- [Product Requirements (PRD)](docs/PRD.md)
- [System Architecture](docs/Architecture.md)
- [Production Deployment](docs/DEPLOYMENT.md)
- [Security Guide](docs/SECURITY.md)

---

## License

Private — FitOra © 2026

# fitora
