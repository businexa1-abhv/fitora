# FitOra API Communication Flow

## Request Path
Client app -> @fitora/api SDK -> API endpoint -> domain service -> database/cache -> response/event.

## Event Path
Domain write -> outbox record -> event publisher -> subscribing services update read models -> notification fanout.

## Core Events
- owner.application.submitted
- owner.application.approved
- owner.subscription.activated
- owner.subscription.expired
- venue.published
- booking.created
- attendance.marked

## Consistency Guarantees
- idempotency key on payment/booking writes
- optimistic UI updates only for non-critical reads
- saga orchestration for cross-service transactional workflows
