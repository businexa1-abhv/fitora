# Real-Time Court Availability Engine

## Overview

FitOra’s availability engine treats **PostgreSQL `CourtSlot` counters as the single source of truth**.

Active payment holds consume bookable capacity (`reservedCount`). Confirmed bookings consume `confirmedCount`. Derived remaining seats:

```
availableSeats = capacity - reservedCount - confirmedCount
```

Socket.IO broadcasts only the **changed slot snapshot** to subscribed rooms. Clients patch local cache — they never poll.

## Operational state vs derived status

Owner-controlled `operationalState` values stored on `CourtSlot`:

| State | Bookable |
|---|---|
| AVAILABLE | Yes (if seats remain) |
| BLOCKED | No |
| MAINTENANCE | No |
| TOURNAMENT | No |
| PRIVATE | No |
| CLOSED | No |

Derived (never stored as owner override):

| Status | Rule |
|---|---|
| FULL | `availableSeats == 0` and operational state is AVAILABLE |
| FEW_SPOTS | remaining ≤ 25% of capacity |
| AVAILABLE | otherwise |

`isBlocked` / `blockReason` remain synchronized for backward compatibility.

## REST API

Canonical routes (nested court routes remain as aliases):

- `GET /api/v1/venues/:id/availability?date=YYYY-MM-DD`
- `GET /api/v1/courts/:courtId/slots?date=YYYY-MM-DD`
- `GET /api/v1/slots/:slotId`
- `POST /api/v1/slots`
- `PATCH /api/v1/slots/:slotId`
- `DELETE /api/v1/slots/:slotId`
- `POST /api/v1/slots/:slotId/block`
- `POST /api/v1/slots/:slotId/unblock`
- `POST /api/v1/slots/:slotId/open`
- `POST /api/v1/slots/:slotId/close`
- `GET /api/v1/courts/:courtId/slots/:slotId/availability`

Conflict responses use HTTP **409** with:

```json
{
  "code": "SLOT_AVAILABILITY_CONFLICT",
  "message": "This slot has just been booked.",
  "slot": { "...current snapshot..." },
  "nearbySlots": [{ "...nearby available..." }]
}
```

## Socket.IO

Namespace: `/realtime`

### Client → server

| Message | Payload |
|---|---|
| `subscribe:court` | `{ courtId, date? }` |
| `unsubscribe:court` | `{ courtId, date? }` |
| `subscribe:venue` | `{ venueId }` |
| `subscribe:tenant` | `{ tenantId }` (owner/admin/coach) |

### Rooms

- `court:{courtId}`
- `court:{courtId}:date:{YYYY-MM-DD}`
- `venue:{venueId}`
- `tenant:{tenantId}`
- `user:{userId}`
- `role:admin`
- `role:trainer`

### Server → client events

Canonical (dot form) plus temporary colon aliases:

- `slot.created` / `slot.updated` / `slot.deleted`
- `slot.blocked` / `slot.unblocked` / `slot.closed`
- `slot.capacity.changed` / `slot.price.changed`
- `slot.booked` / `slot.cancelled` / `slot.available` / `slot.full`
- `booking.created` / `booking.confirmed` / `booking.cancelled`
- `attendance.updated`
- `waitlist.promoted`

Legacy aliases still emitted: `slot:updated`, `slot:released`, `booking:confirmed`, `booking:cancelled`, `attendance:updated`.

### Envelope

Version-aware clients may also receive:

```json
{
  "eventId": "uuid",
  "event": "slot.updated",
  "occurredAt": "ISO-8601",
  "slotVersion": 12,
  "courtId": "...",
  "slotId": "...",
  "data": { "...SlotSnapshot..." }
}
```

Clients **ignore events with `slotVersion` older than the locally known version**.

## Concurrency

1. `SELECT … FOR UPDATE` on `court_slots`
2. Reclaim caller’s expired holds
3. Check remaining seats (holds + confirmed)
4. Persist booking / counter update and bump `version`
5. Emit realtime events (outbox + local fan-out)
6. DB `CHECK (reserved_count + confirmed_count <= capacity)` as last defense

Two players racing the last seat: **one succeeds, one receives 409 `SLOT_AVAILABILITY_CONFLICT`**.

## Durable outbox

`realtime_outbox` stores events in the same transactional boundary when enqueued via `RealtimeOutboxService.enqueueInTx`. Happy-path local emit marks rows `PUBLISHED`. A background pump retries `PENDING`/`FAILED` rows (crash recovery). Multi-instance fan-out uses the Socket.IO Redis adapter when `REDIS_URL` is set.

## Client reconnect protocol

1. Socket.IO reconnects with bounded exponential backoff
2. Re-emit `subscribe:court`
3. Perform **one** HTTP refetch for the viewed court/date
4. Resume patching from live events — **no polling**

## Feature flag

`AVAILABILITY_ENGINE_V2` defaults to `true`. The legacy booking path must not be used in production.

## Deployment

1. Apply migration `20260721104500_realtime_availability_engine`
2. Deploy API (outbox table + operational state)
3. Deploy clients (version-aware hooks)
4. Verify Socket.IO Redis adapter in multi-instance environments
5. Rollback: keep reading legacy `isBlocked`/`blockReason`; operational state remains compatible
