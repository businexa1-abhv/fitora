# FitOra Development Scripts

## Root Scripts
- pnpm dev
- pnpm build
- pnpm lint
- pnpm typecheck
- pnpm test

## New Surface-Specific Scripts
- pnpm dev:player
- pnpm dev:owner
- pnpm dev:admin-web
- pnpm dev:partner
- pnpm dev:shop-partner
- pnpm dev:backend

## Database Scripts
- pnpm db:generate
- pnpm db:migrate
- pnpm db:push
- pnpm db:seed

## Docker Scripts
- pnpm docker:up
- pnpm docker:down
- docker compose -f infra/compose/docker-compose.enterprise.dev.yml up -d
