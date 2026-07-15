# FitOra Enterprise Monorepo Architecture

## Objective
Build all FitOra surfaces in a single production-grade monorepo with shared contracts, shared UI primitives, shared auth, and service-oriented backend boundaries.

## Monorepo Topology
- apps: player-app, owner-app, admin-web, partner-web, shop-partner-web, existing apps
- packages: ui, design-system, api, auth, types, hooks, utils, validation, config, theme, constants
- backend: service packages and shared backend modules
- infra: Docker templates and compose stacks
- docs: architecture, auth/navigation, CI/CD

## Platform Decisions
1. Turborepo + pnpm workspace for fast cached builds and dependency graph integrity.
2. Feature-oriented clean architecture in each app and backend service.
3. Service-oriented NestJS backend split by domain ownership.
4. Shared package contract-first design for type-safe API communication.

## Shared Package Responsibilities
- @fitora/api: typed API SDK, request/response adapters, retry policy hooks
- @fitora/auth: token lifecycle, RBAC helpers, route guards
- @fitora/design-system + @fitora/theme + @fitora/ui: visual consistency across mobile/web
- @fitora/types + @fitora/validation: canonical contracts and zod schemas
- @fitora/utils + @fitora/hooks + @fitora/constants: shared low-level behavior and constants

## Backend Service Responsibilities
- auth-service: login via OTP/Google/Apple, JWT/refresh, role issuance
- owner-service: owner onboarding, verification state, profile lifecycle
- booking-service: inventory, slot lock, booking lifecycle
- membership-service: memberships, entitlements, renewals
- coach-service and student-service: training and attendance
- ecommerce-service: catalog, orders, inventory
- payment-service: subscriptions and transactional payments
- notification-service: push, SMS, email orchestration
- analytics-service: reporting pipelines and admin metrics

## Subscription Enforcement
Owner access is blocked unless subscription is active.
- inactive owner state disables booking creation and membership sales
- inactive owner venues are hidden from player discovery
- successful renewal re-enables owner capabilities without manual intervention

## Scalability Notes
- stateless services behind horizontal autoscaling
- Redis for distributed caching and short-lived locks
- outbox/event-driven integration for cross-service consistency
- strict RBAC and audit logs for every privileged write path

## Development Principles
- strict TypeScript in all packages
- repository pattern in backend services
- react-query for server state, zustand for client state
- react-hook-form + zod for form and payload validation
- mandatory observability hooks (logs/metrics/traces)
