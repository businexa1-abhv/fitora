# FitOra V2 — Product Requirements Document

**Product:** FitOra — The Sports Ecosystem Platform  
**Document:** `FITORA_V2_PRD.md`  
**Version:** 2.0  
**Status:** Draft for leadership review  
**Date:** July 13, 2026  
**Authors:** Chief Product Officer · Principal Software Architect  

---

## Document purpose

This PRD defines **FitOra V2**: a redesign of FitOra from “multi-sided sports booking marketplace” into a **complete Sports Ecosystem Platform**.

It does **not** clone Playo (venue booking + casual play matching).  
It designs a **unique FitOra system** where play, train, compete, equip, belong, and earn live in one product language.

**Grounding:** V1 already ships courts/bookings, memberships, kids training, shop, print, services, payments/wallet, role portals, admin, tenants, and a player mobile app. V2 deepens reliability, unifies experience, and adds **community, events, rewards, academies, and corporate** as first-class pillars.

---

## Table of contents

1. [New Product Vision](#1-new-product-vision)
2. [Information Architecture](#2-information-architecture)
3. [User Journeys](#3-user-journeys)
4. [Navigation](#4-navigation)
5. [Mobile App Structure](#5-mobile-app-structure)
6. [Web Structure](#6-web-structure)
7. [Admin Structure](#7-admin-structure)
8. [Feature Priorities](#8-feature-priorities)
9. [MVP](#9-mvp-v2)
10. [Future Roadmap](#10-future-roadmap)

---

## 1. New Product Vision

### 1.1 Vision statement

> **One app for everything sports.**  
> FitOra is the operating system for India’s sports life — where players discover venues, book play, train with academies, join squads, compete in events, buy and customize gear, get equipment serviced, and earn rewards — while owners, trainers, organizers, and vendors run their businesses on the same rails.

### 1.2 Category position (what we are *not*)

| Adjacent products | Their center of gravity | FitOra difference |
|-------------------|-------------------------|-------------------|
| Venue booking apps | Empty slots → pay → play | Booking is **one orbit**, not the product |
| Fitness trackers | Personal health metrics | FitOra is **social + operational sports**, not biometrics-first |
| Academy SaaS | School admin for one academy | FitOra connects academies to **city demand + parents + payments** |
| Sports e‑comm | Catalog + delivery | Gear is tied to **play context** (team, event, court sport) |
| Tournament tools | Brackets in isolation | Events plug into **venues, payments, print kits, squads** |

**FitOra category:** *Sports Ecosystem OS* — demand + supply + community + commerce on shared identity and payments.

### 1.3 Unique product metaphor — **FitOra Orbit**

Imagine the player (or parent) at the center. Around them are six **Orbits** — permanent product spaces, not buried tabs:

```
                    ┌─────────────┐
                    │  COMPETE    │  Events · Leagues · Brackets
                    └──────┬──────┘
                           │
    ┌──────────┐    ┌──────▼──────┐    ┌──────────┐
    │  EQUIP   │◄───│   PLAYER    │───►│  BELONG  │
    │ Gear ·   │    │  PASSPORT   │    │ Squads · │
    │ Print ·  │    └──────┬──────┘    │ Feed ·   │
    │ Services │           │           │ Chat     │
    └──────────┘    ┌──────▼──────┐    └──────────┘
                    │    PLAY     │  Discover · Book · Check-in
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼────┐ ┌─────▼────┐ ┌─────▼─────┐
        │  TRAIN   │ │  COMMIT  │ │   EARN    │
        │ Academy  │ │ Member-  │ │ Pulse     │
        │ Coaching │ │ ships    │ │ Rewards   │
        └──────────┘ └──────────┘ └───────────┘
```

**Sport Passport** is the durable identity: sports played, venues frequented, academy history, event results, gear preferences, reward tier — portable across cities and tenants.

### 1.4 Design principles (V2)

1. **Orbit clarity** — Every primary action sits in one Orbit; deep links never strand users in a foreign shell.
2. **Sport-contextual** — UI, recommendations, and commerce always know *which sport* and *which city* the user is in.
3. **Dual-sided by design** — Player experience and Operator “Control Rooms” share data contracts; never rebuild domain logic per role.
4. **Trust loops** — Check-in, attendance, proofs, ratings, and payouts are visible artifacts, not black boxes.
5. **India-native** — City-first discovery, UPI-first payments, WhatsApp-grade sharing, vernacular-ready content model.
6. **Compose, don’t clone** — Features combine (Event + Venue + Print kit + Squad) instead of living as siloed mini-apps.
7. **Progressive depth** — Casual booker sees simplicity; academy / organizer / corporate unlocks power tools without cluttering the default path.

### 1.5 Target users (expanded)

| Persona | Job to be done | Success looks like |
|---------|----------------|-------------------|
| **Player** | Find places to play, people to play with, gear that fits | Weekly active play + rebooking |
| **Parent** | Safe, visible kids training & progress | Enrollment + attendance trust |
| **Court Owner** | Fill courts, price smart, run memberships | Occupancy ↑, no-show ↓ |
| **Academy** | Fill batches, manage coaches, bill parents | Batch utilization + retention |
| **Trainer** | Run sessions, mark attendance, report progress | Time saved vs WhatsApp |
| **Service Provider** | Get repair/stringing jobs with clear SLAs | Completed orders + reviews |
| **Printer** | Fulfill team kits with proofing workflow | Throughput + fewer revisions |
| **Tournament Organizer** | Launch events, collect fees, run brackets | Paid registrations |
| **Corporate HR** | Wellness leagues & venue credits for employees | Engagement + utilization reports |
| **Super Admin** | Trust, compliance, marketplace health | Approval SLAs, fraud ↓ |

### 1.6 North-star metrics

| Metric | Definition | V2 Year-1 intent |
|--------|------------|------------------|
| **Weekly Sports Active Users (WSAU)** | Users who completed ≥1 Orbit action (book, train, event, equip order) | Grow as primary engagement KPI |
| **Orbit Coverage** | Avg distinct Orbits touched per WSAU / 28 days | Target ≥2.5 (ecosystem lock-in) |
| **GMV** | All paid entity types | Compound across play + train + equip + events |
| **Supply Fill Rate** | Confirmed bookings / available slot-hours | Owner value proof |
| **Passport Depth** | Profile completeness + verified activity | Trust & personalization |

---

## 2. Information Architecture

### 2.1 Domain map (logical products)

| Domain | Objects | Owns |
|--------|---------|------|
| **Identity** | User, Role, Sport Passport, Parent/Kid | Auth, multi-role, preferences |
| **Discovery** | City, Sport, Venue, Facility, Coach public profile | Search, filters, maps |
| **Play** | Court, Slot, Booking, Check-in, Closure, Pricing rule | Inventory of time |
| **Commit** | Membership plan, Purchase, Usage, Family plan | Recurring access |
| **Train** | Academy, Program, Batch, Enrollment, Attendance, Progress | Coaching ops |
| **Belong** | Squad, Membership (social), Post, Challenge, Invite | Community graph |
| **Compete** | Event, Division, Registration, Bracket, Result | Tournaments & leagues |
| **Equip** | Product, Cart, Order, Listing (service/print), Design | Commerce + care |
| **Earn** | Pulse points, Tier, Challenge reward, Referral | Loyalty |
| **Work** | Control Room (owner/academy/trainer/vendor/organizer/corp) | Supply ops |
| **Govern** | Approvals, Policies, Payouts, Disputes, Audit | Platform |

### 2.2 Entity relationships (conceptual)

```
User ──┬── Sport Passport
       ├── Roles[] (Player, Owner, Trainer, …)
       ├── ParentProfile ── KidProfiles
       └── SquadMemberships

Venue (Court) ── Slots ── Bookings ── Payments
             ── MembershipPlans
             ── Programs/Batches (Academy mode)
             ── Events (host venue)

Event ── Registrations ── Squads / Individuals
      ── PrintKits (optional)
      ── Venue slots (blocked inventory)

Product/Service/Print ── Orders ── Payments ── Reviews
```

### 2.3 Site map — consumer (player / parent)

```
Home (Orbit Hub)
├── Play
│   ├── Discover venues
│   ├── Venue detail → Slots → Checkout → Check-in
│   └── My bookings
├── Train
│   ├── Programs near me
│   ├── My kids
│   ├── Enrollments
│   └── Progress reports (parent view)
├── Belong
│   ├── My squads
│   ├── Find players / open games
│   └── Challenges
├── Compete
│   ├── Upcoming events
│   ├── Event detail → Register
│   └── My registrations / results
├── Equip
│   ├── Shop
│   ├── Services
│   ├── Print
│   └── Orders hub
├── Commit
│   └── Memberships (browse / mine / usage)
├── Earn
│   └── Pulse wallet / tiers / redeem
└── Me
    ├── Passport
    ├── Payments & wallet
    ├── Notifications
    └── Settings
```

### 2.4 Site map — operator Control Rooms

| Control Room | Top-level areas |
|--------------|-----------------|
| **Venue OS** (Court Owner) | Pulse dashboard, Inventory (courts/slots), Demand (bookings), Revenue, Plans, Academy link, Staff, Reports |
| **Academy OS** | Programs, Batches, Coaches, Students, Attendance, Billing, Parent comms |
| **Coach Desk** (Trainer) | Today’s sessions, Attendance, Notes, Progress, Leave |
| **Vendor Desk** (Service / Printer) | Inbox orders, Catalog, SLAs, Payouts |
| **Matchday Console** (Organizer) | Events, Divisions, Entries, Brackets, Communications |
| **Corp Hub** (HR) | Credits, Leagues, Employee roster, Reports |
| **Command** (Super Admin) | Trust queue, Catalog health, Finance, System |

### 2.5 Cross-cutting IA rules

- **One Sport Passport** per human; kids are linked profiles under parents.
- **City + Sport context bar** persists across consumer Orbits.
- **Orders Hub** unifies shop / service / print / event fees (not three “my orders” graves).
- **Deep links** always resolve: Orbit → Object → Action (e.g. `Compete → Event → Register`).

---

## 3. User Journeys

### 3.1 Player — “Friday night badminton”

1. Opens Home → Orbit Hub shows city **Bangalore**, sport **Badminton**.
2. Play → filters distance / price / indoor → picks venue.
3. Selects slot → applies membership benefit or Pulse points → UPI pay.
4. Receives check-in code + calendar add; optional “Need a partner?” → Belong open-game post.
5. After play → rate venue; Pulse points credited; Equip suggests grip replacement.

**Outcome:** Book → belong → earn → equip loop in one session path.

### 3.2 Parent — “Enroll Aarav in U-10 academy”

1. Train → Kids Academy → filter age / sport / distance.
2. Creates Kid profile (DOB, medical notes, emergency contact).
3. Chooses batch → fee breakdown → pay → enrollment ACTIVE.
4. Push/email: schedule + coach intro; attendance visible weekly.
5. Progress report shared; optional Print team kit for academy.

**Outcome:** Trust + visibility replaces WhatsApp fee collection.

### 3.3 Court Owner — “Fill Tuesday off-peak”

1. Venue OS Pulse: occupancy heatmap.
2. Creates off-peak promo membership / dynamic price rule.
3. Opens 2 slots for open games (Belong) tagged to venue.
4. Bookings auto-confirm on payment; no-show marked; report exported.

**Outcome:** Inventory tools + demand levers in one room.

### 3.4 Academy + Trainer — “Batch night”

1. Academy OS assigns coach to batch.
2. Coach Desk: roster → mark attendance → quick note.
3. Parent sees attendance; admin sees utilization.
4. Leave request from trainer → academy approve → substitute flow.

### 3.5 Tournament Organizer — “City open”

1. Matchday Console → create Event (sport, venue block, fee, divisions).
2. Publish → players register (solo or squad) → pay.
3. Optional: Print kit deadline; Equip print orders auto-tagged to event.
4. Generate bracket → publish results → Pulse badges on Passport.

### 3.6 Service Provider / Printer

1. Vendor Desk inbox → Accept → status machine (repair / design review / ship).
2. Upload proof (print) or completion photos (service).
3. Payout ledger; review request to customer.

### 3.7 Corporate HR — “Q3 wellness league”

1. Corp Hub provisions employee domain SSO/invite.
2. Allocates venue credits + creates company league (Compete).
3. Dashboard: participation %, credit burn, top sports.
4. Employees book via Play using corp wallet credits.

### 3.8 Super Admin — “Trust queue morning”

1. Command → pending venue approvals with photo/docs checklist.
2. Dispute / refund flags; payout holds.
3. Marketplace health: conversion, cancellation, SLA breaches.

---

## 4. Navigation

### 4.1 Consumer navigation philosophy

- **Mobile:** 5-tab Orbit shell (see §5) — thumb-zone primary Orbits.
- **Web:** Top Orbit nav + contextual city/sport switcher + Passport avatar menu.
- Avoid dumping every marketplace vertical in the top bar; **Equip** is the umbrella for Shop / Services / Print.

### 4.2 Proposed consumer top-level (web)

| Item | Maps to |
|------|---------|
| Play | Discovery + booking |
| Train | Academy + kids |
| Belong | Squads + open games |
| Compete | Events |
| Equip | Shop · Services · Print |
| Memberships | Commit Orbit (or under Play for density) |
| ··· Avatar | Passport, Pulse, Payments, Settings, Control Room switcher |

**Control Room switcher** (if user has operator roles): “Switch to Venue OS / Coach Desk / …”

### 4.3 Operator navigation patterns

- Persistent left rail grouped by **Pulse / Operate / Grow / Account**.
- Global “Browse FitOra” returns to consumer Orbit Hub (already introduced in portal top bar).
- Notifications bell shared; role-filtered feed.

### 4.4 Navigation anti-patterns (explicitly banned)

- Separate top-level tabs for Print vs Services vs Shop on mobile (use Equip + segmented entry).
- Hiding kids training under “more” for parents.
- Role shells that reimplement booking UIs differently from player booking (same booking object).

---

## 5. Mobile App Structure

**Principle:** Mobile is the **player/parent daily driver**. Heavy operator workflows stay web-first in V2 MVP; Coach Desk gets a focused mobile later.

### 5.1 Tab bar (V2)

| Tab | Purpose | Primary stacks |
|-----|---------|----------------|
| **Home** | Orbit Hub, city/sport context, continue journeys, Pulse teaser | Passport snapshot, upcoming booking/session/event |
| **Play** | Discover + book | Search, venue, booking, my bookings |
| **Train** | Academy + kids | Programs, kids, enrollments, progress |
| **Community** | Belong + Compete highlights | Squads, open games, events list |
| **Me** | Identity & money | Passport, Equip orders, Memberships, Wallet/Pulse, Settings |

> **Store** moves under **Me → Equip** or Home shortcuts — frees a tab for Community (ecosystem differentiation). Shop remains one tap from Home “Equip” rail.

### 5.2 Mobile information architecture (stacks)

```
/(tabs)
  home/
  play/          → search, [venueId], booking/[courtId], bookings
  train/         → programs, kids, enroll/[batchId], progress
  community/     → squads, open-games, events, events/[id]
  me/            → passport, equip/*, memberships, wallet, pulse,
                   notifications, settings, account

/(modals)
  checkout, check-in QR, create open-game, join squad invite
```

### 5.3 Mobile UX rules

- Offline-friendly: upcoming bookings & check-in codes cached.
- Share sheets: venue, open-game, event invite (WhatsApp-first).
- Push taxonomy aligned to Orbits (Play reminder ≠ Train attendance).
- Parent mode toggle when Kid profiles exist (filters Train + notifications).

### 5.4 Deferred to post-MVP mobile

- Full Venue OS / Matchday Console.
- Complex bracket management.
- Bulk inventory / POS for owners.

---

## 6. Web Structure

### 6.1 Public / marketing

| Route | Role |
|-------|------|
| `/` | Vision landing — Orbit story, city proof, CTA Book / List venue |
| `/cities/[city]` | City landing (SEO) |
| `/sports/[sport]` | Sport landing (SEO) |

### 6.2 Consumer app (authenticated + public browse)

| Area | Routes (illustrative) |
|------|------------------------|
| Play | `/play`, `/venues`, `/venues/[id]`, `/bookings` |
| Train | `/train`, `/train/kids`, `/train/enroll/[batchId]` |
| Belong | `/belong`, `/squads`, `/squads/[id]`, `/open-games` |
| Compete | `/events`, `/events/[id]`, `/events/[id]/register` |
| Equip | `/equip`, `/shop/*`, `/services/*`, `/print/*`, `/orders` |
| Commit | `/memberships` |
| Earn | `/pulse` |
| Me | `/passport`, `/account`, `/settings`, `/payments`, `/wallet` |

**Migration note:** Existing `/courts`, `/training`, `/shop`, etc. become aliases or redirects into Orbit routes during V2 rollout.

### 6.3 Control Rooms (web)

| Room | Base path | Priority |
|------|-----------|----------|
| Venue OS | `/ops/venue` (migrate from `/owner`) | P0 |
| Academy OS | `/ops/academy` | P0–P1 |
| Coach Desk | `/ops/coach` (migrate `/trainer`) | P0 |
| Vendor Desk | `/ops/vendor` (merge provider + printer modes) | P1 |
| Matchday Console | `/ops/events` | P1 |
| Corp Hub | `/ops/corp` | P2 |

### 6.4 Web platform architecture (engineering)

- **Apps:** continue Turborepo — `web` (consumer + ops shells), `admin` (Command), `mobile`, `api`.
- **Shared domain packages:** booking, commerce, training, events modules as API boundaries; web uses typed clients.
- **Feature flags** per Orbit for gradual city rollout.
- **Tenancy:** white-label Venue/Academy portals via existing tenant model; Orbit Hub remains FitOra-branded marketplace.

---

## 7. Admin Structure

**Product name:** **FitOra Command** (Super Admin)

### 7.1 Command IA

```
Command
├── Pulse (platform KPIs)
├── Trust & Safety
│   ├── Venue approvals
│   ├── Event approvals (high-risk)
│   ├── User reports / disputes
│   └── Fraud & risk holds
├── Supply
│   ├── Venues & facilities
│   ├── Academies & trainers
│   ├── Vendors (service/print)
│   └── Organizers
├── Demand
│   ├── Users & Passports
│   ├── Bookings ledger
│   ├── Enrollments
│   └── Event registrations
├── Commerce
│   ├── Catalog (shop)
│   ├── Orders (all Equip types)
│   ├── Coupons & campaigns
│   └── Inventory
├── Finance
│   ├── Payments & refunds
│   ├── Payouts
│   ├── Wallet & Pulse ledger
│   └── Tax / invoice exports
├── Engage
│   ├── Notifications & broadcasts
│   └── Pulse challenges config
└── System
    ├── Tenants & branding
    ├── Job queues
    ├── Feature flags
    └── Settings
```

### 7.2 Admin principles

- **Trust queue first** — approvals and disputes above vanity charts.
- **Unified ledgers** — one payment explorer across booking/membership/training/shop/service/print/event/wallet.
- **Audit everything** — role changes, payouts, refunds, approval decisions.
- **City ops mode** — filter Command by launch city for regional managers (future role).

---

## 8. Feature Priorities

Priority scale: **P0** must-have for V2 MVP · **P1** near-term · **P2** expansion · **P3** visionary.

### 8.1 Cross-Orbit platform

| Feature | Priority | Notes |
|---------|----------|-------|
| Sport Passport (profile + activity graph) | P0 | Unify identity UX |
| City + Sport context system | P0 | Discovery spine |
| Orbit Hub home | P0 | Replace fragmented dashboards |
| Unified Orders Hub | P0 | Equip + fees |
| Notification taxonomy by Orbit | P0 | |
| Multi-role Control Room switcher | P0 | |
| Search (venues, events, programs, products) | P1 | Typed facets |
| Recommendations (AI-assisted) | P1–P2 | Build on existing AI module |
| Multi-language | P2 | |
| Wearables / IoT court sensors | P3 | |

### 8.2 Play

| Feature | Priority |
|---------|----------|
| Venue discovery + booking + pay-before-confirm | P0 (harden existing) |
| Check-in codes / QR | P0 |
| Cancellation & refund policy engine | P0 |
| Waitlist / recurring bookings | P1 |
| Dynamic pricing & promos | P1 |
| Facility amenities & photo QA standards | P1 |
| Map-first discovery | P1 |
| Smart locks / access hardware | P3 |

### 8.3 Train / Kids Academy

| Feature | Priority |
|---------|----------|
| Programs, batches, enrollment, payment | P0 (harden) |
| Kid profiles + parent visibility | P0 |
| Attendance + progress | P0 |
| Academy OS (multi-coach, multi-venue) | P1 |
| Trial classes | P1 |
| Curriculum templates | P2 |
| Live class streaming | P3 |

### 8.4 Belong (Community) — **differentiation**

| Feature | Priority |
|---------|----------|
| Squads (create/join) | P0 MVP-lite |
| Open games (“need players”) tied to bookings | P0 MVP-lite |
| Invites & share links | P0 |
| In-app chat (squad / open-game) | P1 |
| Activity feed | P1 |
| Skill tags & fair matchmaking | P2 |
| Reputation / fairplay score | P2 |

### 8.5 Compete (Events)

| Feature | Priority |
|---------|----------|
| Event listing + paid registration | P0–P1 |
| Venue inventory block for events | P1 |
| Divisions & simple knockout brackets | P1 |
| Results on Passport | P1 |
| Recurring leagues | P2 |
| Live scoring | P2 |
| Broadcast integrations | P3 |

### 8.6 Commit (Memberships)

| Feature | Priority |
|---------|----------|
| Plans + purchase + usage | P0 |
| Membership benefits on booking checkout | P0 |
| Family plans | P1 |
| Auto-renew + dunning | P1 |
| Corporate seat memberships | P2 |

### 8.7 Equip (Shop · Services · Print)

| Feature | Priority |
|---------|----------|
| Shop cart/checkout/orders | P0 |
| Services order lifecycle | P0 |
| Print order + design upload + proofing | P0 |
| Unified Equip entry + Orders Hub | P0 |
| Event/academy kit bundles | P1 |
| Returns / disputes | P1 |
| 3P seller marketplace | P2 |
| In-browser design studio | P2 |

### 8.8 Earn (Rewards)

| Feature | Priority |
|---------|----------|
| Pulse points on paid actions | P0 MVP-lite |
| Tier badge on Passport | P1 |
| Redeem on booking / shop | P1 |
| Referrals | P1 |
| Challenges (Belong/Compete hooks) | P2 |
| Partner perks | P2 |

### 8.9 Corporate

| Feature | Priority |
|---------|----------|
| Corp Hub + employee invites | P2 |
| Credit wallet | P2 |
| Company leagues | P2 |
| HR analytics export | P2 |

### 8.10 Operator / Admin

| Feature | Priority |
|---------|----------|
| Venue OS hardening | P0 |
| Coach Desk hardening | P0 |
| Command trust + finance ledgers | P0 |
| Vendor Desk unification | P1 |
| Matchday Console | P1 |
| Split payouts to owners/vendors | P1 |
| Academy OS | P1 |

---

## 9. MVP (V2)

### 9.1 MVP definition

**FitOra V2 MVP** proves the ecosystem thesis in **1–2 launch cities**:

> A player can **Play**, **Train** (incl. kids), **Belong** (lightweight), **Equip**, and **Earn** (basic Pulse) in one app — while owners/trainers/admin operate reliably on shared rails — without needing Corporate or full tournament complexity on day one.

### 9.2 In scope (MVP)

**Consumer**

- Orbit Hub home with city + sport context  
- Play: discovery, booking, payment, check-in, cancellations/refunds (policy-driven)  
- Train: programs, kid profiles, enroll, attendance/progress visibility  
- Belong: create/join Squad; post Open Game linked to a booking; invite links  
- Equip: unified entry to Shop / Services / Print + Orders Hub  
- Commit: memberships usable at checkout  
- Earn: Pulse points accrual on successful payments + simple balance view  
- Passport: profile, sports, upcoming, recent activity  
- Account/settings with **session-hardened** auth (invalid token → logout)

**Mobile**

- New 5-tab structure (Home, Play, Train, Community, Me)  
- Parity for MVP consumer journeys above  

**Web ops**

- Venue OS + Coach Desk (evolved owner/trainer)  
- Vendor flows for service/print (existing, UX-unified under Equip ops)  

**Command**

- Approvals, users, bookings, payments, commerce, notifications, queues  

**Platform**

- Feature flags for Belong / Pulse  
- Analytics: WSAU, Orbit Coverage, GMV by Orbit  

### 9.3 Out of scope (MVP)

- Full Matchday brackets / live scoring  
- Corporate Hub  
- In-app design studio  
- Hardware access / IoT  
- Full chat platform (can use share-to-WhatsApp + in-app comments MVP)  
- 3P multi-seller marketplace  
- Vernacular UI (content model ready, UI later)  

### 9.4 MVP success criteria (90 days post-launch)

| Criterion | Target |
|-----------|--------|
| WSAU | City-specific baseline set; WoW growth |
| % WSAU using ≥2 Orbits | ≥35% |
| Booking payment success rate | ≥92% |
| Court approval SLA | &lt; 48 business hours |
| Parent NPS (training) | ≥40 |
| Open games created → filled | ≥25% fill rate |
| Crash-free sessions (mobile) | ≥99.5% |

### 9.5 Technical MVP notes (architecture)

- Preserve modular Nest API; add `community`, `events`, `loyalty` modules without breaking payment entity enum (extend carefully).  
- Sync `@fitora/types` with Prisma status enums (`NO_SHOW`, enrollment states).  
- Introduce BFF-friendly “Orbit home” aggregate endpoint to avoid mobile N+1.  
- Redirect map from V1 routes → V2 Orbit routes.  
- Auth: migrate toward httpOnly cookies **or** mitigate XSS + enforce server session validation on all Me/Passport pages.

---

## 10. Future Roadmap

### Phase A — **Foundation** (0–3 months) · V2 MVP

- Orbit IA + navigation migration  
- Harden Play / Train / Equip / payments  
- Belong MVP (Squads + Open Games)  
- Pulse points ledger (earn-only or earn+simple redeem)  
- Passport v1  
- Command finance/trust hardening  

### Phase B — **Compete & Depth** (3–6 months)

- Events listing + paid registration  
- Simple brackets + results on Passport  
- Waitlists, recurring bookings, family memberships  
- Vendor Desk unification + payouts v1  
- In-app squad messaging  
- Map-first Play discovery  
- Academy OS v1  

### Phase C — **Network Effects** (6–12 months)

- Skill-based matchmaking  
- Leagues + seasonality  
- Pulse tiers + partners  
- Event kit bundles (print + shop)  
- AI recommendations in Orbit Hub  
- Regional Command roles  
- Supply mobile (Coach Desk lite, Venue check-in staff mode)  

### Phase D — **Ecosystem Scale** (12–24 months)

- Corporate Hub + wellness leagues  
- White-label Orbit for large academies/venues  
- Public APIs / partner widgets  
- Advanced fraud, insurance partners  
- Hardware partnerships (access, lighting)  
- Pan-India vernacular + voice booking experiments  

```
Timeline (indicative)

Q1          Q2          Q3          Q4          Y2
|-----------|-----------|-----------|-----------|
 Foundation | Compete & | Network   | Scale     |
 Orbit MVP  | Depth     | Effects   | Corporate |
 Belong+Pulse Events    Matchmaking APIs/IoT    |
```

---

## Appendix A — Competitive differentiation checklist

FitOra V2 wins when a user can answer **yes** to:

1. Can I book a court *and* enroll my kid *and* join a squad *and* register for a tournament *without* switching apps?  
2. Does my Sport Passport remember my sports life across venues and cities?  
3. Do owners/trainers/organizers share the same inventory and payment truth as players?  
4. Does commerce (gear/print/repair) attach to real play context (team, event, sport)?  
5. Do rewards feel like progress in sport — not generic cashback spam?

If the product only optimizes slot booking UX, it has failed this PRD.

---

## Appendix B — Glossary

| Term | Meaning |
|------|---------|
| **Orbit** | Top-level product space (Play, Train, Belong, Compete, Equip, Commit, Earn) |
| **Sport Passport** | Durable player/parent sports identity & history |
| **Control Room** | Operator workspace (Venue OS, Coach Desk, etc.) |
| **Command** | Super Admin console |
| **Pulse** | FitOra rewards / points system |
| **Open Game** | Community listing to fill remaining players for a booking |
| **Squad** | Persistent group of players |
| **WSAU** | Weekly Sports Active Users |
| **Orders Hub** | Unified list of Equip + fee-bearing registrations |

---

## Appendix C — Relationship to V1 docs

| Doc | Relationship |
|-----|----------------|
| `docs/PRD.md` (v1) | Historical baseline; V2 supersedes vision/IA/roadmap for product direction |
| `docs/Architecture.md` | Remains technical foundation; extend with Orbit modules & BFF aggregates |
| `docs/MULTI_TENANCY.md` | Still valid for Venue/Academy white-label under Control Rooms |
| This document | **Canonical product direction for FitOra V2** |

---

## Document control

| Version | Date | Notes |
|---------|------|-------|
| 2.0 | 2026-07-13 | Initial V2 ecosystem PRD (Orbit model, IA, journeys, MVP, roadmap) |

**Next steps for leadership**

1. Approve Orbit naming & mobile tab tradeoff (Community vs Store).  
2. Lock MVP city list and WSAU targets.  
3. Sequence engineering epics: IA migration → Belong → Pulse → Events.  
4. Commission UX: Orbit Hub + Passport + Control Room switcher.  
