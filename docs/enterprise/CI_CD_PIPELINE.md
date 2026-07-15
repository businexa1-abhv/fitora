# FitOra CI/CD Pipeline (Enterprise)

## Pipeline Stages
1. Validate
- pnpm install --frozen-lockfile
- turbo run lint typecheck test

2. Build
- turbo run build
- build backend and web container images

3. Security
- dependency and secret scanning
- container image vulnerability scan

4. Deploy
- deploy to staging
- run smoke checks
- manual approval gate
- deploy to production

## Mobile Release
- EAS build profile per environment
- OTA updates for non-breaking changes
- store builds for release candidates

## Branch Strategy
- trunk-based with protected main branch
- required status checks before merge

## Rollback
- immutable image tags
- one-click rollback to previous stable release
- runbook-driven operational rollback process
