# FitOra Play — Product & Technical Design

**Product:** FitOra Play (Host · Join · Fill · Pay · Check in · Rate)  
**Document:** `Play-Architecture.md`  
**Version:** 1.0  
**Status:** Design specification (no implementation)  
**Date:** July 13, 2026  
**Related:** [`FITORA_V2_PRD.md`](./FITORA_V2_PRD.md) · [`Community-Architecture.md`](./Community-Architecture.md) · [`Mobile-UX.md`](./Mobile-UX.md) · [`Web-UX.md`](./Web-UX.md)

---

## 1. Vision

### 1.1 What Play is

**FitOra Play** is the product layer for *organized pickup and hosted matches*—not only “book a empty court alone.”

A **Match** is a social + commercial object that can:

- Reserve venue inventory (optional but common)  
- Recruit players (invite + public “missing players”)  
- Collect / split money  
- Coordinate via game chat  
- Record attendance & QR check-in  
- Collect ratings  
- Unlock achievements  
- Live in history / Passport  

**One-liner:** *From empty slot to full game—invite, fill, pay, play, rate.*

### 1.2 Design principles

1. **Match-first** — UX speaks “Host match / Join match,” not only “Create booking.”  
2. **Inventory optional** — Indoor court booking preferred; park/meetup matches allowed without FitOra venue (P1).  
3. **Fill the roster** — Missing-player discovery is a first-class loop (ties to Community).  
4. **Money follows seats** — Split payments are explicit; host is not always sole payer.  
5. **Trust artifacts** — QR check-in, attendance, ratings feed reputation & achievements.  
6. **State machines are law** — UI and money only move through defined transitions.

### 1.3 Personas

| Persona | Goals |
|---------|--------|
| **Host** | Create match, fill seats, collect dues, check in squad |
| **Invitee / Joiner** | Join via link/invite, pay share, chat, check in |
| **Nearby player** | Discover open seats in city/sport |
| **Venue desk** | Validate QR / roster (Venue OS) |

---

## 2. Feature set

| Feature | Description |
|---------|-------------|
| **Host Match** | Create match: sport, time, venue/slot, roster size, skill, visibility, payment mode |
| **Join Match** | Request/auto-join open seat; accept invite |
| **Invite Friends** | In-app friends + share link (WhatsApp) |
| **Find Missing Players** | Public/circle listing of open seats; recommendations |
| **Split Payments** | Per-seat pricing, host-pays-all, or custom shares; settle before confirm |
| **Game Chat** | Match-scoped thread (text; media P1) |
| **Attendance** | Mark played / no-show / cancelled seat |
| **Check-in QR** | Per-match or per-player QR; venue/host scan |
| **Ratings** | Rate players, host, venue (policy-gated) |
| **Achievements** | Host/join/fill/streak unlocks |
| **History** | Past matches on Passport / Play tab |

---

## 3. Core concepts

### 3.1 Object model (logical)

```
Match
  ├── MatchSlotRequirement?     → links CourtSlot / Booking (0..1)
  ├── MatchRoster
  │     └── MatchParticipant[]  (host, confirmed, invited, waitlisted, …)
  ├── MatchPaymentPlan          → split rules
  │     └── MatchPaymentShare[] → per participant amounts
  ├── MatchChatThread
  │     └── ChatMessage[]
  ├── MatchCheckIn
  │     └── CheckInEvent[]
  ├── MatchAttendance[]
  ├── MatchRating[]
  └── MatchInvite[]             → tokens / friend targets
```

**Open Game** (Community docs) = public discovery projection of a Match with `visibility ∈ {public, circle}` and open seats.  
**Booking** = paid venue reservation; a Match may **own** or **attach** one booking.

### 3.2 Roles on a Match

| Role | Rights (summary) |
|------|------------------|
| **Host** | Edit policy fields (while draft/open), invite, kick (rules), start check-in, close match, attendance override |
| **Co-host** (P1) | Subset of host |
| **Participant** | Chat, pay own share, check in self, rate after complete |
| **Waitlisted** | Notify on seat open; promote on accept |
| **Venue staff** | Scan QR, view roster (Venue OS capability) |

---

## 4. Workflows

### 4.1 Host Match (with venue booking)

```
1. Host taps Host Match
2. Select sport, date/time, venue → pick available slot(s)
3. Configure roster: total seats, skill, gender notes (optional), visibility
4. Configure payment mode:
     - HOST_PAYS_ALL
     - SPLIT_EQUAL
     - SPLIT_CUSTOM
     - PAY_AT_VENUE (log only; limited trust)
5. Create Match → status = DRAFT
6. Reserve slot → create Booking (PENDING pay) OR hold inventory
7. Host completes booking payment (or first payment per plan)
8. Match → OPEN (or FILLING)
9. Invite friends + optional publish to Missing Players
10. As seats fill + shares paid → roster CONFIRMED seats
11. Match → LOCKED (optional T-minus policy) → IN_PROGRESS → COMPLETED
```

### 4.2 Host Match (without venue — meetup)

```
1–4 as above, location = free-text / map pin (no CourtSlot)
5. Match DRAFT → OPEN without Booking
6. Split payments may cover “host expenses” pot (P1) or be disabled
7. Check-in = host-scanned / self-check-in geofence soft (P2)
```

### 4.3 Invite Friends

```
1. Host opens Invite
2. Select Friends (Community graph) and/or copy link / WhatsApp share
3. System creates MatchInvite (PENDING)
4. Invitee opens link → Match detail
5. Accept → Participant INVITED→JOINED (pending pay if required)
6. Decline / expire invite
```

### 4.4 Join Match (public / missing players)

```
1. Player discovers Match via Play → Open Games, Home suggestions, Circle, link
2. Views seats left, skill, price share, venue
3. Request join OR instant join (policy)
4. If approval required: Host approves/rejects
5. On join: create MatchPaymentShare; redirect to pay if SPLIT_*
6. Payment success → seat CONFIRMED
7. Added to Game Chat; push to host
```

### 4.5 Find Missing Players

```
1. Host enables “Find players” (visibility public/circle)
2. Match appears in discovery indexes (city, sport, time, skill)
3. Recommendations engine suggests candidates (Community)
4. Host can invite suggested players
5. When full → auto-unlist from discovery; status may → FILLED
```

### 4.6 Split Payments

```
Modes:
A. HOST_PAYS_ALL
   - Host pays Booking total (and optional extras)
   - Others join free (or tip pot P2)

B. SPLIT_EQUAL
   - total = booking + fees
   - share = ceil(total / confirmed_or_expected_seats) with rounding rules
   - Host may pay “unfilled seat risk” or seats reserved only after pay

C. SPLIT_CUSTOM
   - Host sets amount per seat/participant

Settlement policies (configurable):
- CONFIRM_SEAT_ON_PAY (recommended default)
- HOST_COVER_THEN_SETTLE (IOU; higher risk — later)
- ALL_PAID_BEFORE_LOCK

Refunds:
- Follow venue cancellation policy + Match leave policy
- Partial refunds of shares via Payments/Refunds modules
```

**Rounding:** Prefer smallest currency unit; remainder assigned to host share.

### 4.7 Game Chat

```
1. Thread created when Match leaves DRAFT
2. Participants with CONFIRMED or JOINED (policy) can read/write
3. System messages: join, pay, leave, check-in, roster full
4. Host can mute user / lock chat when COMPLETED
5. Retention: keep with History; report → moderation
```

### 4.8 Attendance

```
1. After IN_PROGRESS or COMPLETED trigger
2. Default attendance = UNKNOWN
3. Sources:
   - QR check-in success → PRESENT
   - Host mark PRESENT / NO_SHOW / EXCUSED
   - Auto NO_SHOW if LOCKED seat + no check-in by end+grace
4. Attendance feeds ratings eligibility, reputation, achievements
```

### 4.9 Check-in QR

```
Modes:
1. Match QR (single code) — host/venue scans once; marks all present manually still needed
2. Per-participant QR (recommended) — encodes matchId + participantId + short-lived signature

Flow:
1. Match → CHECKIN_OPEN (T-minus N minutes through end+grace)
2. Player shows QR in app
3. Scanner (host or venue staff) validates signature + status CONFIRMED
4. CheckInEvent recorded → Attendance PRESENT
5. Invalid: expired, wrong match, already checked in, not on roster
```

### 4.10 Ratings

```
Window: COMPLETED + attendance PRESENT (or all confirmed — policy)
Targets:
- Venue (if booking-linked)
- Host (by participants)
- Fellow players (optional, capped)
Dimensions: skill fairness, punctuality, friendliness (simple 1–5 + tags)
Cooldown: once per rater/target/match; edits within 24h
Effects: Passport reputation aggregates; abuse reports
```

### 4.11 Achievements (Play-triggered)

Examples: First host, First join, Fill a match, 5 night games, Streak 3 weeks, Bring 3 friends.  
Emitted on state transitions / attendance; consumed by Community gamification engine.

### 4.12 History

```
Play → History / Passport → Matches
Filters: hosted, joined, sport, city, date
Detail: roster, scores/notes (optional), ratings given/received, chat read-only
```

---

## 5. State machines

### 5.1 Match lifecycle

```
                     ┌──────────────┐
                     │    DRAFT     │
                     └──────┬───────┘
                            │ publish / inventory reserved
                            ▼
                     ┌──────────────┐
            ┌────────│     OPEN     │────────┐
            │        └──────┬───────┘        │
            │               │ seats filling  │
            │               ▼                │
            │        ┌──────────────┐        │
            │        │   FILLING    │        │
            │        └──────┬───────┘        │
            │               │ roster full    │
            │               ▼                │
            │        ┌──────────────┐        │
            │        │    FILLED    │        │
            │        └──────┬───────┘        │
            │               │ T-minus lock   │
            │               ▼                │
            │        ┌──────────────┐        │
            │        │    LOCKED    │        │
            │        └──────┬───────┘        │
            │               │ start window   │
            │               ▼                │
            │        ┌──────────────┐        │
            │        │ CHECKIN_OPEN │        │
            │        └──────┬───────┘        │
            │               │ match start    │
            │               ▼                │
            │        ┌──────────────┐        │
            │        │ IN_PROGRESS  │        │
            │        └──────┬───────┘        │
            │               │ end + settle   │
            │               ▼                │
            │        ┌──────────────┐        │
            └───────►│  COMPLETED   │◄───────┘
                     └──────────────┘

Terminal cancels (from OPEN/FILLING/FILLED/LOCKED before start):
                     ┌──────────────┐
                     │  CANCELLED   │
                     └──────────────┘

Expired unfilled (optional):
                     ┌──────────────┐
                     │  EXPIRED     │
                     └──────────────┘
```

**Transition table (Match)**

| From | To | Trigger |
|------|-----|---------|
| DRAFT | OPEN | Host publish + booking pay rules satisfied |
| OPEN | FILLING | First non-host confirmed seat OR any join |
| FILLING | FILLED | `confirmedCount == rosterSize` |
| FILLED | FILLING | Seat freed before LOCKED |
| OPEN/FILLING/FILLED | LOCKED | `now >= start - lockMinutes` (job) |
| LOCKED | CHECKIN_OPEN | `now >= start - checkInOpenMinutes` |
| CHECKIN_OPEN | IN_PROGRESS | `now >= start` |
| IN_PROGRESS | COMPLETED | `now >= end + grace` or host complete |
| * | CANCELLED | Host cancel / venue revoke / payment failure policy |
| OPEN/FILLING | EXPIRED | Start reached with below `minPlayers` |

### 5.2 Participant lifecycle

```
INVITED ──accept──► JOINED ──pay──► CONFIRMED
    │                  │               │
    │ decline/expire   │ leave         │ leave/kick (policy)
    ▼                  ▼               ▼
 DECLINED          WITHDRAWN       WITHDRAWN / REMOVED
                       │
 WAITLISTED ──promote──┘

CONFIRMED ──check-in──► CHECKED_IN
CHECKED_IN / CONFIRMED ──attendance──► PRESENT | NO_SHOW | EXCUSED
```

| From | To | Trigger |
|------|-----|---------|
| — | INVITED | Host invite / link claim hold |
| INVITED | JOINED | Accept (pay pending) |
| INVITED | DECLINED | Decline / expire |
| — | WAITLISTED | Join when full |
| WAITLISTED | JOINED | Promotion + accept |
| JOINED | CONFIRMED | Share PAID or free seat |
| JOINED/CONFIRMED | WITHDRAWN | User leave |
| CONFIRMED | REMOVED | Host kick (pre-lock rules) |
| CONFIRMED | CHECKED_IN | Valid QR |
| * | NO_SHOW etc. | Attendance module |

### 5.3 Payment share lifecycle

```
DUE ──► PROCESSING ──► PAID
  │         │
  │         └──► FAILED ──► DUE (retry)
  └──► CANCELLED / REFUNDED / PARTIALLY_REFUNDED
```

Seat confirmation should key off **PAID** when `CONFIRM_SEAT_ON_PAY`.

### 5.4 Check-in window machine (Match flags)

```
CHECKIN_CLOSED → CHECKIN_OPEN → CHECKIN_CLOSED
(open at T-minus; close at end+grace)
```

---

## 6. Database design (logical schema)

> Logical model for Postgres. Names illustrative; no migration code here.

### 6.1 `matches`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| host_user_id | uuid FK users | |
| sport | enum/text | |
| title | text | optional |
| description | text | |
| visibility | enum | private, friends, circle, public |
| status | enum | see Match SM |
| roster_size | int | |
| min_players | int | for EXPIRED rule |
| skill_level | text/enum | nullable |
| venue_id | uuid FK | nullable |
| court_id | uuid FK | nullable |
| booking_id | uuid FK | nullable, unique |
| starts_at | timestamptz | |
| ends_at | timestamptz | |
| timezone | text | |
| city | text | |
| location_text | text | meetup |
| geo | point | optional |
| find_players_enabled | bool | |
| payment_mode | enum | HOST_PAYS_ALL, SPLIT_EQUAL, SPLIT_CUSTOM, PAY_AT_VENUE |
| lock_minutes | int | default e.g. 60 |
| checkin_open_minutes | int | |
| chat_thread_id | uuid | |
| created_at / updated_at | timestamptz | |
| cancelled_at | timestamptz | |
| cancel_reason | text | |

**Indexes:** `(status, city, sport, starts_at)`, `(host_user_id, starts_at)`, `(booking_id)`.

### 6.2 `match_participants`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| match_id | uuid FK | |
| user_id | uuid FK | |
| role | enum | HOST, COHOST, PLAYER |
| status | enum | participant SM |
| seat_index | int | optional |
| invited_by | uuid | |
| joined_at | timestamptz | |
| checked_in_at | timestamptz | |
| unique(match_id, user_id) | | |

### 6.3 `match_invites`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| match_id | uuid FK | |
| inviter_id | uuid | |
| invitee_user_id | uuid | nullable if link-only |
| token_hash | text | for share links |
| status | enum | PENDING, ACCEPTED, DECLINED, EXPIRED, REVOKED |
| expires_at | timestamptz | |

### 6.4 `match_payment_plans` / `match_payment_shares`

**Plan:** match_id, currency, total_amount, mode, rounding_strategy.  
**Share:** participant_id, amount_due, amount_paid, status, payment_id FK, due_at.

### 6.5 `match_chat_threads` / `match_chat_messages`

thread: match_id unique.  
messages: thread_id, sender_id, body, type (user/system), created_at, deleted_at.

### 6.6 `match_check_in_tokens` / `match_check_in_events`

tokens: participant_id, token_jti, expires_at, revoked.  
events: match_id, participant_id, scanner_user_id, method (QR/MANUAL), scanned_at, meta.

### 6.7 `match_attendance`

match_id, participant_id, status (UNKNOWN, PRESENT, NO_SHOW, EXCUSED), source, marked_by, marked_at.  
unique(match_id, participant_id).

### 6.8 `match_ratings`

match_id, rater_id, target_type (USER/VENUE/HOST), target_id, score, tags[], comment, created_at.  
unique(match_id, rater_id, target_type, target_id).

### 6.9 Discovery projection (optional table or materialized view)

`match_open_listings`: match_id, seats_left, city, sport, starts_at, skill, price_share, geo—for Missing Players search.

---

## 7. API design (logical)

Base prefix: `/api/v1/play` (or `/matches`). Auth Bearer unless noted.

### 7.1 Host & CRUD

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/matches` | Create DRAFT (body: sport, time, venue/slot, roster, payment_mode, visibility) |
| GET | `/matches/{id}` | Detail + roster + my share + chat cursor |
| PATCH | `/matches/{id}` | Edit while DRAFT/OPEN (restricted fields) |
| POST | `/matches/{id}/publish` | DRAFT→OPEN (+ booking pay handoff) |
| POST | `/matches/{id}/cancel` | Cancel + refund policy |

### 7.2 Invites & join

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/matches/{id}/invites` | Invite friend user_ids |
| POST | `/matches/{id}/invites/link` | Create share token |
| POST | `/invites/{token}/accept` | Accept link invite |
| POST | `/matches/{id}/join` | Join / request join |
| POST | `/matches/{id}/join/approve` | Host approve request |
| POST | `/matches/{id}/leave` | Withdraw |
| GET | `/matches/open` | Find Missing Players listing |
| GET | `/matches/recommendations` | Suggested matches for me |

### 7.3 Payments

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/matches/{id}/payment` | Plan + my share |
| POST | `/matches/{id}/payment/shares/{shareId}/pay` | Start Razorpay/mock order |
| POST | `/matches/{id}/payment/recalculate` | Host recalc SPLIT_* (pre-lock) |

(Webhooks reuse platform Payments module; entity type `MATCH_SHARE` or map to booking + transfers.)

### 7.4 Chat

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/matches/{id}/chat` | Paginated messages |
| POST | `/matches/{id}/chat` | Send message |
| POST | `/matches/{id}/chat/read` | Read receipt optional |

### 7.5 Check-in & attendance

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/matches/{id}/check-in/qr` | Player’s current QR payload |
| POST | `/matches/{id}/check-in/scan` | Scanner submits token |
| POST | `/matches/{id}/attendance` | Host bulk/mark |
| GET | `/matches/{id}/attendance` | Roster attendance |

### 7.6 Ratings, history, achievements hooks

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/matches/{id}/ratings` | Submit ratings |
| GET | `/matches/{id}/ratings` | Visible aggregates |
| GET | `/me/matches` | History (hosted/joined filters) |
| GET | `/me/matches/upcoming` | Play tab |

Achievements: not direct Play write APIs—**domain events** → Community gamification.

### 7.7 Idempotency & errors

- `Idempotency-Key` on join, pay, scan.  
- 409 on invalid state transitions with machine error codes (`MATCH_LOCKED`, `ROSTER_FULL`, `SHARE_NOT_DUE`, `CHECKIN_CLOSED`).

---

## 8. Jobs & workers

| Job | Action |
|-----|--------|
| `match.lock` | OPEN/FILLING/FILLED → LOCKED |
| `match.checkin_open` | → CHECKIN_OPEN |
| `match.start` | → IN_PROGRESS |
| `match.complete` | → COMPLETED; open rating window; attendance autos |
| `match.expire` | under min_players |
| `invite.expire` | revoke pending |
| `listing.reindex` | open seats projection |
| `share.remind` | unpaid DUE shares |

Use existing BullMQ/Redis patterns.

---

## 9. Payments integration notes

- Prefer **one Booking payment** for venue inventory + **MatchPaymentShare** rows for peer splits.  
- Alternative: booking amount = 0 hold + each share pays portion into pooled capture (harder legally)—**v1: host pays booking, shares reimburse host** *or* **each share pays platform which settles venue** (platform merchant).  
- **Recommended v1:** Platform collects all shares; venue booking paid by platform settlement rules; host share included.  
- Entity types: extend payments with `MATCH_SHARE`; refunds module handles leave/cancel.  
- `PAY_AT_VENUE`: participants CONFIRMED without PAID; attendance still required; lower discovery priority.

---

## 10. Security & abuse

- Signed QR (short TTL, single use or rotating).  
- Join rate limits; invite caps.  
- Chat: block/report; host mute.  
- Visibility respected in `/matches/open`.  
- Under-18: restrict public find-players; friends-only default.  
- Audit host kicks and refund overrides.

---

## 11. Notifications

| Event | Audience |
|-------|----------|
| Invite received | Invitee |
| Join / leave | Host |
| Share unpaid reminder | Participant |
| Roster full | Host + participants |
| Check-in open | Confirmed roster |
| Match cancelled | All |
| Rating reminder | Present attendees |

Channels: push, in-app, WhatsApp share (link only).

---

## 12. Analytics

- Hosted matches / WAU  
- Fill rate (listed → FILLED)  
- Time-to-fill  
- Share payment success rate  
- Check-in rate  
- Rating coverage  
- Conversion: Missing Players view → join → pay  

---

## 13. UI entry points

| Surface | Entry |
|---------|--------|
| Mobile Play tab | Host Match, Open Games, My Games, History |
| Mobile Home | Continue / Upcoming / Friends Playing / Suggestions |
| Web Community / Play | Open games, host wizard |
| Venue OS Calendar | Roster + scan check-in |
| Passport | History, achievements |

---

## 14. Delivery phases

### Phase A — Core loop

Host Match + booking attach · Invite friends · Join · Equal split pay · Basic chat · History · Match SM  

### Phase B — Fill & trust

Find Missing Players · Recommendations · QR check-in · Attendance · Ratings · Achievements events  

### Phase C — Flex

Meetup without venue · Custom split · Waitlist · Co-host · Realtime chat · PAY_AT_VENUE polish  

---

## 15. Open decisions

| Topic | Options | Recommendation |
|-------|---------|----------------|
| Who pays the venue | Host only vs pooled shares | **Pooled shares via platform (v1 equal split)** |
| Approval to join | Always / never / host toggle | **Host toggle; default instant if public** |
| Kick after pay | Allow pre-lock only | **Pre-LOCKED only + refund** |
| Chat product | In-app vs WhatsApp group | **In-app thread P0; WhatsApp share link always** |
| Open Game naming | Match vs Open Game | **UX: Match; discovery: “Open matches”** |

---

## 16. Document control

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-07-13 | Play workflows, DB, APIs, state machines |

**Out of scope:** Source code, Prisma migrations, UI pixels.  
**Next:** Prisma ERD review → OpenAPI draft → Play mobile wizard epic.
