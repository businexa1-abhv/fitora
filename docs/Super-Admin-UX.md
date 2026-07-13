# FitOra Super Admin Portal — UI Architecture

**Product:** FitOra Command (Super Admin)  
**Document:** `Super-Admin-UX.md`  
**Version:** 1.0  
**Status:** Design specification (no implementation)  
**Date:** July 13, 2026  
**Platform:** Desktop-first Web (`apps/admin`)  
**Related:** [`FITORA_V2_PRD.md`](./FITORA_V2_PRD.md) · [`Web-UX.md`](./Web-UX.md) · [`SECURITY.md`](./SECURITY.md)

---

## 1. Product definition

### 1.1 Purpose

**FitOra Command** is the Super Admin portal for platform governance: trust & safety, supply quality, demand operations, commerce, finance, content, engagement, and system control.

It is **not** a Venue OS / Academy OS clone. Operators run businesses in Control Rooms; Command **governs the network**.

### 1.2 Design principles

1. **Trust queue first** — Approvals, disputes, refunds, and risk before vanity charts.  
2. **Ledger clarity** — Every rupee and status transition is inspectable.  
3. **Role-scoped density** — Super Admin sees all; future City Ops / Support Agent see subsets via Permissions.  
4. **Audit by default** — Sensitive actions require reason codes and appear in Audit Logs.  
5. **Desktop-first** — Primary layout ≥1280px; tablet usable; phone is read-only triage only.  
6. **Same domain language** as consumer/web docs (Venues, Courts, Academies, Events, etc.).

### 1.3 Primary admin personas

| Persona | Focus |
|---------|--------|
| **Super Admin** | Full access, config, permissions, flags |
| **Trust Moderator** | Venues, users, support, audit (read) |
| **Finance Ops** | Payments, refunds, coupons, analytics finance |
| **Marketplace Ops** | Store, services, printing, CMS |
| **Support Agent** | Support tickets, user lookup, limited refunds |
| **City Ops** (future) | Geo-filtered supply/demand |

---

## 2. UI architecture (shell)

### 2.1 Application chrome

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Top Bar: Command logo · Global search · City scope · Alerts · Avatar    │
├──────────────┬──────────────────────────────────────────────────────────┤
│              │ Page Header: Title · breadcrumbs · primary actions         │
│  Sidebar     ├──────────────────────────────────────────────────────────┤
│  (grouped)   │                                                          │
│              │  Main canvas (tables, detail, wizards, dashboards)         │
│              │                                                          │
│              ├──────────────────────────────────────────────────────────┤
│              │ Optional context drawer (filters / activity / help)        │
└──────────────┴──────────────────────────────────────────────────────────┘
```

### 2.2 Shell regions

| Region | Responsibility |
|--------|----------------|
| **Sidebar** | Module navigation by group; collapse to icons |
| **Top bar** | Omnisearch (users, bookings, payments, venues), environment badge (Prod/Staging), notification bell (ops alerts), profile |
| **Page header** | Title, short description, breadcrumbs, primary/secondary actions |
| **Main canvas** | List / detail / dashboard / form |
| **Context drawer** | Advanced filters, timeline, audit snippet for current entity |
| **Command palette** | `⌘K` / `Ctrl+K` — jump to module or record |

### 2.3 Layout patterns (reuse everywhere)

| Pattern | When |
|---------|------|
| **List + filters** | Users, bookings, payments, orders… |
| **Master–detail** | Split view optional for high-volume queues |
| **Entity detail** | Tabs: Overview · Related · Timeline · Audit |
| **Approval queue** | Card or table with Accept / Reject + reason |
| **Dashboard** | KPI row → charts → queues → shortcuts |
| **Settings form** | Sectioned forms with save barriers |
| **Diff / JSON viewer** | Feature flags, CMS, audit payloads |

### 2.4 Data density conventions

- Tables: sticky header, column picker, saved views, bulk actions bar.  
- Default page size 25; virtualize at 100+.  
- Status = pills; money = right-aligned INR; IDs = mono + copy.  
- Destructive actions: confirm modal + typed reason when irreversible.

---

## 3. Information architecture — sidebar

### 3.1 Navigation groups

```
COMMAND
├── Overview
│   └── Dashboard
├── People
│   ├── Users
│   ├── Players
│   ├── Court Owners
│   └── Trainers
├── Supply
│   ├── Venues
│   ├── Courts
│   └── Kids Academy
├── Demand
│   ├── Bookings
│   ├── Memberships
│   └── Events
├── Commerce
│   ├── Store
│   ├── Services
│   ├── Printing
│   └── Coupons
├── Finance
│   ├── Payments
│   ├── Refunds
│   └── Analytics
├── Engage
│   ├── CMS
│   ├── Notifications
│   └── Support
└── System
    ├── Audit Logs
    ├── Permissions
    ├── Feature Flags
    └── (Settings / Queues — existing system tools)
```

### 3.2 Module → route map (target)

| Module | Base path | Notes |
|--------|-----------|-------|
| Dashboard | `/` | |
| Users | `/users` | All accounts |
| Players | `/players` | Filtered persona view |
| Court Owners | `/owners` | |
| Venues | `/venues` | Facility / business entity |
| Courts | `/courts` | Bookable units (may nest under venue) |
| Bookings | `/bookings` | |
| Memberships | `/memberships` | Plans + purchases |
| Kids Academy | `/academy` | Programs, batches, enrollments |
| Trainers | `/trainers` | |
| Events | `/events` | |
| Store | `/store` | Products, inventory, shop orders |
| Services | `/services` | Listings + service orders |
| Printing | `/printing` | Print listings + orders |
| Payments | `/payments` | |
| Refunds | `/refunds` | Queue + ledger |
| Analytics | `/analytics` | |
| CMS | `/cms` | Pages, blog, banners |
| Coupons | `/coupons` | |
| Notifications | `/notifications` | Broadcasts + templates |
| Support | `/support` | Tickets |
| Audit Logs | `/audit` | |
| Permissions | `/permissions` | Roles & grants |
| Feature Flags | `/flags` | |

---

## 4. Module UI architecture

Each module below: **purpose · primary screens · key UI · critical actions**.

---

### 4.1 Dashboard

**Purpose:** Morning ops pulse — health, money, trust backlog.

**Screens:** `/` single canvas (customizable widgets later).

**Wireframe zones**

```
[KPI row: GMV today · Bookings · Active users · Refund queue · Pending approvals]
[Trust queues: Venue approvals · Partner apps · Open disputes · SLA breaches]
[Charts: GMV 7/30d · Booking funnel · Orbit mix]
[Live feeds: Failed payments · High-value bookings · Feature flag changes]
[Shortcuts: deep links to hottest queues]
```

**Widgets (P0):** KPIs, approval counts, refund backlog, payment success rate, system job failures.

---

### 4.2 Users

**Purpose:** Canonical identity directory (all roles).

**Screens:** List · User detail · Impersonation request (gated) · Role assignment.

**List columns:** Name, email, phone, roles[], status, city, created, last login.  
**Detail tabs:** Profile · Roles · Sessions · Bookings · Payments · Tickets · Audit.  
**Actions:** Suspend / reinstate, verify email/phone, force logout, reset password link, add role.

---

### 4.3 Players

**Purpose:** Demand-side lens (PLAYER role + Passport summary).

**Screens:** List · Player detail (Passport-oriented).

**Extra fields:** Sports preferences, WSAU proxy, bookings count, kids linked, Pulse tier.  
**Actions:** Same as Users but default filters `role=PLAYER`; quick “View as consumer” link (public profile).

---

### 4.4 Court Owners

**Purpose:** Supply operators who own venues.

**Screens:** List · Owner detail · Owned venues panel · Payout profile (future).

**Actions:** Approve owner capability, suspend settlements (future), open Venue OS as read-only support (audited).

---

### 4.5 Venues

**Purpose:** Business / facility entity (brand, address, KYC, multi-court).

**Screens:** Approval queue · Venue list · Venue detail · Media QA.

**Detail tabs:** Overview · Courts · Memberships · Staff · Documents · Reviews · Audit.  
**Actions:** Approve / reject (reason), suspend listing, feature on homepage (CMS hook), request resubmission.

**Relationship:** Venue 1→N Courts.

---

### 4.6 Courts

**Purpose:** Bookable inventory units (sport, slots config, pricing).

**Screens:** List (filter by venue, sport, approval, city) · Court detail · Slot health.

**Actions:** Force unpublish, flag pricing anomalies, link to bookings for this court.  
**Note:** If V1 only has “Court” as venue, UI still separates **Venue (org)** vs **Court (asset)** for V2 clarity—migrate model accordingly.

---

### 4.7 Bookings

**Purpose:** Demand ledger for play inventory.

**Screens:** List · Booking detail · No-show tools.

**Columns:** ID, venue/court, player, slot, status, amount, payment status, check-in, created.  
**Detail:** Timeline (created→paid→confirmed→completed/cancelled/no-show), refund shortcut, support links.  
**Bulk:** Export CSV; limited bulk cancel only with finance permission.

---

### 4.8 Memberships

**Purpose:** Plans catalog + purchase lifecycle.

**Screens:** Plans list · Plan detail · Purchases list · Purchase detail.

**Actions:** Disable plan, investigate abuse, comp membership (audited), view usage.

---

### 4.9 Kids Academy

**Purpose:** Programs, batches, enrollments, attendance oversight.

**Screens:**  
- Programs list/detail  
- Batches  
- Enrollments  
- Kids directory (PII-sensitive)  
- Attendance anomalies  

**Actions:** Suspend enrollment, reassign trainer (ops), parent contact via Support.  
**Compliance:** Extra masking for minor PII; access logged.

---

### 4.10 Trainers

**Purpose:** Coach supply quality.

**Screens:** List · Trainer profile · Assignments · Leave overview · Performance snapshot.

**Actions:** Verify badge, suspend, link to academy/venue.

---

### 4.11 Events

**Purpose:** Govern tournaments/leagues.

**Screens:** Approval queue · Events list · Event detail (registrations, divisions, brackets read-only) · Risk flags.

**Actions:** Approve/publish/unpublish, cancel event (cascade policy), refund batch trigger → Refunds module.

---

### 4.12 Store

**Purpose:** Catalog + inventory + shop orders.

**Screens:** Products · Product detail/edit · Categories · Inventory movements · Shop orders · Order detail.

**Actions:** Publish/unpublish SKU, adjust inventory (reason), cancel/fulfill overrides, returns intake → Refunds.

---

### 4.13 Services

**Purpose:** Service marketplace listings + orders.

**Screens:** Listings · Listing detail · Service orders · SLA monitor.

**Actions:** Delist provider, mediate dispute, force status (audited).

---

### 4.14 Printing

**Purpose:** Print vendors, designs, production pipeline.

**Screens:** Print listings · Print orders · Design review queue.

**Actions:** Escalate stuck DESIGN_REVIEW, delist printer, quality flags.

---

### 4.15 Payments

**Purpose:** Unified payment explorer across entity types.

**Screens:** Payments list · Payment detail · Provider recon tools (Razorpay refs).

**Columns:** ID, entity type, entity id, user, amount, status, method, provider ref, created.  
**Detail:** Attempts, webhook log summary, invoice link, refund CTA.  
**Filters:** Entity type (booking/membership/training/shop/service/print/event/wallet), status, date, city.

---

### 4.16 Refunds

**Purpose:** Dedicated finance/trust queue (not buried in Payments).

**Screens:** Refund queue · Refund detail · Policy helper.

**States:** Requested · Approved · Rejected · Processing · Completed · Failed.  
**Actions:** Approve/reject with reason, partial refund amount, retry failed provider calls.  
**Guardrails:** Dual-control for amounts above threshold (Permissions).

---

### 4.17 Analytics

**Purpose:** Insights beyond Dashboard ops pulse.

**Screens:** Overview · Acquisition · Supply health · Commerce · Academy · Events · Custom report export.

**UI:** Date range, city scope, saved reports, chart + table dual view.  
**Note:** Heavy queries async → “Report ready” notification.

---

### 4.18 CMS

**Purpose:** Editorial & growth surfaces.

**Screens:**  
- Pages (landing blocks)  
- Blog posts (align with public `/blog`)  
- Banners / hero campaigns  
- FAQ snippets for Support  
- City/sport landing content  

**Patterns:** Draft / Scheduled / Published; preview link; locale later.  
**Permissions:** Editors ≠ publishers (capability split).

---

### 4.19 Coupons

**Purpose:** Campaign discounts across Orbits.

**Screens:** Coupons list · Create/Edit wizard · Redemption log.

**Fields:** Code, type (%/flat), entity scope (booking/shop/…), limits, window, city/sport, partner-funded flag.  
**Actions:** Activate/deactivate, clone campaign.

---

### 4.20 Notifications

**Purpose:** Platform messaging control.

**Screens:**  
- Templates (email/SMS/push/in-app)  
- Broadcast composer  
- Scheduled jobs  
- Delivery logs  
- Preference policy defaults  

**Guardrails:** Broadcast requires permission + optional approval; dry-run audience count.

---

### 4.21 Support

**Purpose:** Customer & partner ticket ops.

**Screens:** Ticket queue · Ticket detail · Macros · Link to User/Booking/Payment.

**Detail layout:** Conversation · Customer snapshot · Related entities · Internal notes · Audit.  
**SLA:** Priority, clock, breach highlighting on Dashboard.

---

### 4.22 Audit Logs

**Purpose:** Immutable-ish activity trail for security & compliance.

**Screens:** Searchable log · Event detail (actor, action, entity, before/after, IP, request id).

**Filters:** Actor, action type, entity type, date, outcome.  
**UI:** JSON diff viewer; export for incidents.  
**Rule:** No delete in UI; retention per SECURITY policy.

---

### 4.23 Permissions

**Purpose:** Who can do what inside Command.

**Screens:** Roles list · Role detail (capabilities matrix) · Admin user grants · Permission catalog.

**Model (UI):**  

- **Roles** (Super Admin, Finance Ops, …)  
- **Capabilities** mapped to modules/actions (e.g. `refunds.approve`, `venues.approve`, `cms.publish`)  
- **Assignments** user↔role  

**UI pattern:** Matrix checkbox grid with “dangerous” capabilities highlighted.

---

### 4.24 Feature Flags

**Purpose:** Progressive delivery & kill switches.

**Screens:** Flags list · Flag detail · Targeting · Change history (feeds Audit).

**Fields:** Key, description, default, percentage rollout, city allowlist, user allowlist, Orbit tag.  
**Actions:** Toggle, schedule, emergency disable (all envs).  
**Safety:** Confirm modal for production; require reason.

---

## 5. Cross-cutting UI systems

### 5.1 Global search (`⌘K` + top bar)

**Result groups:** Users · Venues/Courts · Bookings · Payments · Orders · Events · Tickets · Docs (CMS).  
Each hit shows type badge + status + jump action.

### 5.2 City / environment scope

- **City scope** filter in top bar narrows lists/analytics (City Ops).  
- **Environment badge** (Production / Staging) always visible.

### 5.3 Alerts

Ops alerts: payment provider down, queue lag, spike in refunds, approval SLA breach → bell + Dashboard strip.

### 5.4 Entity timeline

Shared component on detail pages: chronological domain events + audit snippets.

### 5.5 PII & minors

- Mask phone/email by default; reveal with permission + audit.  
- Kids Academy: stronger masking, watermarked exports.

---

## 6. Screen hierarchy (condensed sitemap)

```
/
/users · /users/[id]
/players · /players/[id]
/owners · /owners/[id]
/venues · /venues/approvals · /venues/[id]
/courts · /courts/[id]
/bookings · /bookings/[id]
/memberships/plans · /memberships/purchases · …/[id]
/academy/programs · /academy/batches · /academy/enrollments · /academy/kids
/trainers · /trainers/[id]
/events · /events/approvals · /events/[id]
/store/products · /store/orders · /store/inventory · /store/categories
/services/listings · /services/orders
/printing/listings · /printing/orders · /printing/design-review
/payments · /payments/[id]
/refunds · /refunds/[id]
/analytics · /analytics/[report]
/cms/posts · /cms/pages · /cms/banners
/coupons · /coupons/[id] · /coupons/new
/notifications/templates · /notifications/broadcasts · /notifications/logs
/support · /support/tickets/[id]
/audit · /audit/[id]
/permissions/roles · /permissions/roles/[id] · /permissions/users
/flags · /flags/[key]
/settings · /queues                    (system continuity)
```

---

## 7. Key admin flows

### 7.1 Approve venue

```
Dashboard / Venues → Approvals
  → Venue detail (docs, photos, courts)
  → Approve OR Reject + reason
  → Notify owner
  → Audit log entry
```

### 7.2 Investigate failed payment → refund

```
Payments (status=FAILED|PAID anomaly)
  → Payment detail
  → Linked booking/order
  → Create refund request OR retry capture
  → Refunds queue approval
  → Provider call
  → User notification
  → Audit
```

### 7.3 Support ticket to booking fix

```
Support ticket
  → Link user + booking
  → Policy panel
  → Optional refund / goodwill coupon
  → Macro reply
  → Resolve
```

### 7.4 Publish CMS + flag

```
CMS draft → Preview → Publish (permission)
Feature Flags → enable Orbit for city %
  → Monitor Analytics + Alerts
  → Kill switch if needed
```

### 7.5 Role change

```
Permissions → Admin user
  → Assign Finance Ops
  → Confirm
  → Force re-login
  → Audit
```

---

## 8. Permissions model (UI-facing)

### 8.1 Capability namespaces

`dashboard.read` · `users.*` · `venues.approve` · `bookings.read` · `payments.read` · `refunds.approve` · `refunds.approve_high` · `store.publish` · `cms.publish` · `notifications.broadcast` · `support.*` · `audit.read` · `permissions.manage` · `flags.manage` · `academy.pii.reveal` · …

### 8.2 UI enforcement

- Sidebar items hidden if no read capability.  
- Buttons disabled/hidden by action capability.  
- Server remains source of truth (UI hide ≠ security).

---

## 9. Responsive & density behavior

| Viewport | Behavior |
|----------|----------|
| **≥1440px** | Full sidebar + optional context drawer open |
| **1024–1439** | Collapsible sidebar; drawer overlay |
| **768–1023** | Icon sidebar; tables horizontal scroll; detail full page |
| **&lt;768** | Not primary; queue triage only (approvals, tickets); warn “Use desktop for finance” |

---

## 10. Empty, error, and loading states

- **Empty queues:** celebratory calm (“No pending approvals”).  
- **Errors:** inline + retry; correlation id for support.  
- **Loading:** skeleton tables; don’t blank entire shell.  
- **Stale data:** last refreshed timestamp on Dashboard/Analytics.

---

## 11. Migration from current admin

| Current (`ADMIN_NAV`) | Target Command module |
|-----------------------|------------------------|
| Dashboard | Dashboard |
| Users | Users (+ Players / Owners split views) |
| Courts | Courts + Venues |
| Bookings | Bookings |
| Memberships | Memberships |
| Payments | Payments + Refunds |
| Products / Shop Orders / Inventory | Store |
| Coupons | Coupons |
| Services | Services (+ Printing split) |
| Reports / Analytics | Analytics |
| Notifications | Notifications |
| Queues / Settings | System |
| — | Kids Academy, Trainers, Events, CMS, Support, Audit, Permissions, Feature Flags |

Phased delivery: **Trust + Finance + People** → **Commerce split** → **Academy/Events** → **CMS/Flags/Permissions**.

---

## 12. Delivery phases

### Phase A — Command foundation

- Shell IA (new sidebar groups)  
- Dashboard trust queues  
- Users / Venues approvals / Bookings / Payments  
- Refunds module  
- Audit Logs (read)  

### Phase B — Commerce & engage

- Store / Services / Printing separation  
- Coupons · Notifications · Support  
- CMS blog/banners  

### Phase C — Ecosystem govern

- Kids Academy · Trainers · Events  
- Permissions matrix UI  
- Feature Flags  
- Analytics packs  

---

## 13. Open decisions

| Topic | Options | Recommendation |
|-------|---------|----------------|
| Venues vs Courts | Single model vs split | **Split in UI**; migrate data model as needed |
| Printing under Store | Nested vs sibling | **Sibling** under Commerce (per module list) |
| Impersonation | Allow vs forbid | **Forbid by default**; time-boxed “support session” later |
| Admin dark mode | Yes / no | **Yes**, match brand tokens |
| Separate Support Agent app | Same portal vs scoped | **Same portal**, Permissions-scoped |

---

## 14. Document control

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-07-13 | Super Admin UI architecture — 24 modules, shell, IA, flows |

**Out of scope:** Implementation code, API schemas, visual Figma.  
**Next:** Figma Command shell + Dashboard + Approval queue + Payment/Refund detail → engineering epics.
