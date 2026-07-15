# FitOra Environment Configuration

## Strategy
- `.env.example` for non-sensitive defaults
- app/service local env files for developer overrides
- secrets injected via CI/CD secret manager only

## Core Variables
- AUTH_JWT_SECRET
- AUTH_REFRESH_SECRET
- DATABASE_URL
- REDIS_URL
- PAYMENT_PROVIDER_KEY
- PAYMENT_PROVIDER_SECRET
- PUSH_SERVICE_KEY

## App Variables
- player-app: EXPO_PUBLIC_API_URL
- owner-app: EXPO_PUBLIC_API_URL
- admin-web: NEXT_PUBLIC_API_URL
- partner-web: NEXT_PUBLIC_API_URL
- shop-partner-web: NEXT_PUBLIC_API_URL

## Backend Service Variables
Each backend service can define:
- SERVICE_PORT
- SERVICE_NAME
- LOG_LEVEL
- SERVICE_DATABASE_URL
- SERVICE_REDIS_URL

## Security Rules
- never commit secrets
- rotate production keys periodically
- apply least-privilege credentials per service
