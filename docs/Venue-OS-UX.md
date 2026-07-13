# FitOra Venue OS — Court Owner SaaS UX Architecture

**Product:** FitOra Venue OS (Court Owner Control Room)  
**Document:** `Venue-OS-UX.md`  
**Version:** 1.0  
**Status:** Design specification (no implementation)  
**Date:** July 13, 2026  
**Platform:** Desktop-first Web (`/ops/venue` · migrate from `/owner`)  
**Related:** [`FITORA_V2_PRD.md`](./FITORA_V2_PRD.md) · [`Web-UX.md`](./Web-UX.md) · [`Super-Admin-UX.md`](./Super-Admin-UX.md) · [`Mobile-UX.md`](./Mobile-UX.md)

---

## 1. Product definition

### 1.1 Purpose

**Venue OS** is the SaaS workspace where court owners run their sports business: fill inventory, collect revenue, manage memberships & academy, sell add-ons, retain customers, and operate across branches.

Players book on FitOra consumer apps; **owners operate truth of inventory, staff, and money here**.

### 1.2 Experience principles

1. **Pulse before paperwork** — Dashboard answers “How is my business today?” in &lt;5 seconds.  
2. **Inventory is sacred** — Calendar + Slot Management are the operational heart.  
3. **Branch-aware** — Every list/report respects selected branch (or “All branches”).  
4. **One customer graph** — Bookings, memberships, kids, loyalty share the same customer record.  
5. **Monetize the visit** — Products, services, printing sit beside play—not in a disconnected shop admin.  
6. **Subscription clarity** — FitOra SaaS plan (what the owner pays FitOra) ≠ player memberships.  
7. **Desktop-first** — Calendar density needs ≥1280px; tablet for check-in/day-of ops.

### 1.3 Owner personas

| Persona | Needs |
|---------|--------|
| **Owner / GM** | Revenue, multi-branch, subscription, settings |
| **Front desk** | Calendar, bookings, check-in, customers |
| **Academy coordinator** | Academy, kids, trainers |
| **Ops manager** | Slots, staff, reports |
| **Marketing** | Loyalty, offers (limited) |

Staff see a **capability-scoped** sidebar (Settings → Staff permissions).

---

## 2. UI architecture (shell)

### 2.1 Application chrome

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Top: Venue OS · Branch switcher · Date · Search · Alerts · Browse FitOra │
│      · Owner avatar                                                      │
├──────────────┬───────────────────────────────────────────────────────────┤
│              │ Page header: Title · context chips · primary actions        │
│  Sidebar     ├───────────────────────────────────────────────────────────┤
│  (grouped)   │ Main canvas                                                │
│              │                                                           │
└──────────────┴───────────────────────────────────────────────────────────┘
```

### 2.2 Shell regions

| Region | Role |
|--------|------|
| **Sidebar** | Module nav; collapses to icons |
| **Branch switcher** | All branches · per location; persists in session |
| **Global search** | Customers, bookings, memberships, kids |
| **Alerts** | Conflicts, low occupancy tomorrow, payout issues, subscription past due |
| **Browse FitOra** | Exit to consumer Orbit Hub |
| **Page header** | Title, branch breadcrumb, CTAs |

### 2.3 Core layout patterns

| Pattern | Modules |
|---------|---------|
| **KPI dashboard** | Dashboard, Revenue |
| **Calendar canvas** | Calendar, day-of ops |
| **Resource planner** | Slot Management |
| **CRM table** | Customers, Bookings, Kids |
| **Catalog admin** | Memberships, Products, Services, Printing |
| **People admin** | Trainers, Staff |
| **Report builder** | Reports |
| **Settings hub** | Settings, Subscription, Multi Branch |

### 2.4 Branch context rules

- Selecting a branch scopes courts, slots, staff, reports, academy programs tagged to that branch.  
- **All branches** = aggregated KPIs; edits that need a court require picking a branch first.  
- Multi Branch module manages the branch list; switcher consumes it.

---

## 3. Information architecture — sidebar

```
VENUE OS
├── Overview
│   ├── Dashboard
│   └── Revenue
├── Operations
│   ├── Bookings
│   ├── Calendar
│   └── Slot Management
├── Programs
│   ├── Memberships
│   ├── Academy
│   ├── Kids
│   └── Trainers
├── Commerce
│   ├── Products
│   ├── Services
│   └── Printing
├── Growth
│   ├── Customers
│   ├── Loyalty
│   └── Reports
└── Account
    ├── Staff
    ├── Settings
    ├── Subscription Billing
    └── Multi Branch
```

### 3.1 Route map (target)

| Module | Path |
|--------|------|
| Dashboard | `/ops/venue` |
| Revenue | `/ops/venue/revenue` |
| Bookings | `/ops/venue/bookings` |
| Calendar | `/ops/venue/calendar` |
| Slot Management | `/ops/venue/slots` |
| Memberships | `/ops/venue/memberships` |
| Academy | `/ops/venue/academy` |
| Kids | `/ops/venue/kids` |
| Trainers | `/ops/venue/trainers` |
| Staff | `/ops/venue/staff` |
| Products | `/ops/venue/products` |
| Services | `/ops/venue/services` |
| Printing | `/ops/venue/printing` |
| Customers | `/ops/venue/customers` |
| Loyalty | `/ops/venue/loyalty` |
| Reports | `/ops/venue/reports` |
| Settings | `/ops/venue/settings` |
| Subscription Billing | `/ops/venue/billing` |
| Multi Branch | `/ops/venue/branches` |

Legacy `/owner/*` → redirects into `/ops/venue/*`.

---

## 4. Module UX architecture

---

### 4.1 Dashboard

**Job:** Today’s pulse + tomorrow’s risk.

**Zones**

```
[Greeting + branch + date]
[KPI row: Today revenue · Occupancy % · Bookings · Check-ins due · Open conflicts]
[Occupancy heatmap: courts × hours (today/next 7)]
[Queues: Pending payments · Cancellations · Academy sessions today · Low-stock SKUs]
[Shortcuts: Add slots · Walk-in booking · Check in · Invite trainer]
[Trends sparkline: 7-day revenue vs last week]
```

**Empty/new venue:** Setup checklist (add court → slots → publish → first membership).

---

### 4.2 Revenue

**Job:** Understand money—not just booking count.

**Views:** Overview · By court · By sport · By channel (FitOra / walk-in / membership burn) · Payouts (if enabled).

**UI**

- Date range + branch  
- KPI cards: Gross · Net · Refunds · Avg ticket · Membership share  
- Stacked charts + drill-down table to bookings/orders  
- Export CSV / PDF  

**Distinction:** Player payments for play/commerce vs **Subscription Billing** (SaaS fee to FitOra).

---

### 4.3 Bookings

**Job:** Ledger of all reservations.

**Screens:** List · Booking detail · Create walk-in / manual booking.

**List:** Filters (status, court, date, source, customer); columns include check-in code, amount, channel.  
**Detail:** Slot, customer, payment, policy actions (cancel, no-show, reschedule within rules), notes, linked open game (read-only).  
**Create:** Pick court/date/slot → customer search/create → price override (permissioned) → collect payment / mark pay-at-venue.

---

### 4.4 Calendar

**Job:** Day-of visual operations.

**UI pattern:** Resource calendar — rows = courts (or trainers for academy mode toggle); columns = time.

```
[Day | Week toggle] [Court filter] [Sport filter]
┌────────┬──────┬──────┬──────┐
│ Court  │ 6am  │ …    │ 10pm │
│ Court A│ #### │ book │ #### │
│ Court B│ free │ #### │ free │
└────────┴──────┴──────┴──────┘
Legend: Confirmed · Pending · Blocked · Academy · Event hold
```

**Interactions:** Click empty → create booking/block; click event → detail drawer; drag-resize only if policy allows (default: edit via Slot Management / booking detail).  
**Overlays:** Staff shifts (optional), maintenance blocks.

---

### 4.5 Slot Management

**Job:** Generate and govern sellable inventory.

**Screens:** Rules · Generate wizard · Closures · Peak pricing · Slot list/grid health.

**Capabilities**

- Recurring templates (weekday/weekend)  
- Peak / off-peak / holiday pricing  
- Bulk generate date range  
- Close court (maintenance, private event)  
- Min/max duration, buffer between slots  

**Guardrail:** Warn before deleting slots with existing bookings.

---

### 4.6 Memberships

**Job:** Recurring access products for players.

**Screens:** Plans list · Plan editor · Subscribers · Usage.

**Plan editor:** Duration, price, court/sport scope, booking credits or % off, guest rules, branch scope.  
**Subscribers:** Active/expired/past_due; comp or pause (permissioned).  
**Link:** Checkout on consumer app reads these plans.

---

### 4.7 Academy

**Job:** Coaching programs as a business line.

**Screens:** Programs · Batches · Schedule · Curriculum notes (light) · Enrollment pipeline.

**Program:** Sport, age band, fee, venue/branch, description.  
**Batch:** Schedule, capacity, assigned trainer(s), enrollment count.  
**Actions:** Publish to FitOra Academies discovery; close batch; message parents (via notifications template).

---

### 4.8 Kids

**Job:** Child roster for the venue’s academy (owner view).

**Screens:** Kids list · Kid detail (enrollments, attendance summary, parent contact).

**PII:** Parent phone/email masked for staff without permission.  
**Actions:** Cannot invent medical data freely—parent-owned fields read-only; owner notes separate.

---

### 4.9 Trainers

**Job:** Coach workforce linked to academy/batches.

**Screens:** Roster · Invite trainer · Assignment matrix · Leave calendar (read + approve if owner).

**Invite:** Email → FitOra trainer account link · assign branches/programs.  
**Performance (light):** Sessions held, attendance marked rate (not full HRIS).

---

### 4.10 Staff

**Job:** Venue OS users (desk, managers)—not players.

**Screens:** Staff list · Invite · Role templates · Activity (last login).

**Role templates (default):** Admin (owner) · Manager · Front desk · Academy coordinator · Read-only analyst.  
**Capabilities examples:** `bookings.create`, `slots.manage`, `refunds.request`, `customers.pii`, `billing.view`.

---

### 4.11 Products

**Job:** On-site / FitOra-listed SKUs (grips, shuttles, apparel) sold by this venue.

**Screens:** Catalog · Inventory · Orders (venue-attributed).

**Modes:** Sell on FitOra Marketplace (if enabled) and/or counter sale logging.  
**Inventory:** Low-stock alerts on Dashboard.

---

### 4.12 Services

**Job:** Venue-run or partner stringing/repair offered under venue brand.

**Screens:** Service listings · Incoming requests · Status board.

**Flow:** Customer books via FitOra Services → appears in venue inbox → accept → complete.

---

### 4.13 Printing

**Job:** Team kits / jersey orders tied to venue or academy batches.

**Screens:** Print offerings · Orders · Design approval (if venue acts as seller).

**Hook:** Academy batch “order kit” campaign → printing orders list.

---

### 4.14 Customers

**Job:** CRM for everyone who played, joined, or bought.

**Screens:** List · Customer 360 · Merge duplicates (careful).

**360 tabs:** Profile · Bookings · Memberships · Kids · Orders · Loyalty · Notes · Timeline.  
**Actions:** Message (template), issue coupon, flag VIP/problem, export (permissioned).

---

### 4.15 Loyalty

**Job:** Venue-level retention (may sync with FitOra Pulse later).

**Screens:** Program setup · Points rules · Members · Redemptions.

**Rules examples:** Points per paid booking, birthday bonus, membership multiplier.  
**Redeem:** Discount on next booking / product (policy engine).  
**Phase:** MVP can be “FitOra Pulse pass-through analytics” then venue-custom programs.

---

### 4.16 Reports

**Job:** Scheduled & ad-hoc business intelligence.

**Report packs:** Occupancy · Revenue · Memberships · Academy utilization · Trainer load · Product margin · Customer cohort (light).

**UI:** Pick pack → date/branch → run → chart+table → export · schedule email to owner.

---

### 4.17 Settings

**Job:** Venue profile & policies.

**Sections**

- Business profile (name, logo, address, GSTIN)  
- Courts list shortcut  
- Booking policies (cancellation windows, no-show)  
- Taxes & invoices  
- Notifications (owner alerts)  
- Integrations (calendar export, webhooks—future)  
- Danger zone (transfer ownership—Super Admin assisted)

---

### 4.18 Subscription Billing

**Job:** What the **venue pays FitOra** for SaaS.

**Screens:** Current plan · Usage meters · Invoices · Payment method · Upgrade/downgrade.

**Plans (illustrative):** Starter (1 branch) · Growth (multi-court) · Pro (academy + commerce) · Enterprise.  
**Meters:** Courts count, branches, staff seats, GMV commission (if applicable).  
**States:** Trial · Active · Past due · Suspended (consumer listing paused with warning).  
**UI never confuses this with player Memberships module.**

---

### 4.19 Multi Branch

**Job:** Locations under one owner organization.

**Screens:** Branch list · Add branch · Branch detail · Court assignment · Brand overrides (optional).

**Branch fields:** Name, address, city, timezone, contact, active flag.  
**Effects:** Switcher options; reports; staff scoping; academy/program attachment.  
**Add branch:** May require FitOra plan upgrade (deep link Subscription Billing) + Command approval for public listing.

---

## 5. Screen hierarchy (sitemap)

```
/ops/venue
/ops/venue/revenue
/ops/venue/bookings
/ops/venue/bookings/new
/ops/venue/bookings/[id]
/ops/venue/calendar
/ops/venue/slots
/ops/venue/slots/generate
/ops/venue/slots/closures
/ops/venue/memberships
/ops/venue/memberships/plans/[id]
/ops/venue/memberships/subscribers
/ops/venue/academy
/ops/venue/academy/programs/[id]
/ops/venue/academy/batches/[id]
/ops/venue/kids
/ops/venue/kids/[id]
/ops/venue/trainers
/ops/venue/trainers/invite
/ops/venue/trainers/[id]
/ops/venue/staff
/ops/venue/staff/invite
/ops/venue/products
/ops/venue/products/[id]
/ops/venue/services
/ops/venue/services/orders/[id]
/ops/venue/printing
/ops/venue/printing/orders/[id]
/ops/venue/customers
/ops/venue/customers/[id]
/ops/venue/loyalty
/ops/venue/reports
/ops/venue/reports/[pack]
/ops/venue/settings
/ops/venue/billing
/ops/venue/branches
/ops/venue/branches/new
/ops/venue/branches/[id]
```

---

## 6. Key owner flows

### 6.1 Morning open

```
Dashboard
  → Review conflicts / check-ins
  → Calendar (today)
  → Mark no-shows / check-ins
```

### 6.2 Publish weekly inventory

```
Slot Management → Generate wizard
  → Select courts + date range + template
  → Preview conflicts
  → Commit
  → Dashboard occupancy updates
```

### 6.3 Walk-in booking

```
Bookings → New (or Calendar empty slot)
  → Customer search/create
  → Pay (UPI/cash logged)
  → Confirmation / print slip (optional)
```

### 6.4 Launch kids batch

```
Academy → Program → Create batch
  → Assign trainer
  → Publish
  → Enrollments appear from FitOra
  → Kids roster updates
```

### 6.5 Add second location

```
Subscription Billing → ensure plan allows branches
  → Multi Branch → Add branch
  → Add courts → slots
  → Assign staff
  → Switcher includes new branch
```

### 6.6 Retain customer

```
Customers 360 → low recent visits
  → Loyalty bonus / coupon
  → Optional notification template
```

---

## 7. Cross-module map

```
Multi Branch ──scopes──► All operational modules
Slot Management ──feeds──► Calendar ──shows──► Bookings
Memberships ──discounts──► Bookings checkout (consumer)
Academy ──batches──► Trainers + Kids
Customers ◄── Bookings · Memberships · Kids · Products · Loyalty
Products / Services / Printing ──orders──► Revenue
Subscription Billing ──entitles──► Multi Branch · Staff seats · feature gates
Reports ◄── all ledgers
Staff permissions ──gates──► module actions
```

---

## 8. Permissions (Venue OS)

| Capability (examples) | Front desk | Manager | Owner |
|-----------------------|:----------:|:-------:|:-----:|
| Calendar view / check-in | ✓ | ✓ | ✓ |
| Create booking | ✓ | ✓ | ✓ |
| Slot generate | | ✓ | ✓ |
| Price override | | ✓ | ✓ |
| Membership plan edit | | ✓ | ✓ |
| Staff invite | | | ✓ |
| Billing / subscription | | | ✓ |
| Multi branch add | | | ✓ |
| Customer PII full | | ✓ | ✓ |
| Reports export | | ✓ | ✓ |

UI hides unauthorized nav items; API enforces.

---

## 9. Responsive behavior

| Viewport | Behavior |
|----------|----------|
| **≥1440px** | Full calendar density, sidebar expanded |
| **1024–1439** | Usable calendar; collapse sidebar |
| **768–1023** | Day calendar default; week via horizontal scroll; stack filters |
| **&lt;768** | Check-in + today’s bookings + alerts; deep config blocked with “Open on desktop” |

---

## 10. Empty states & onboarding

**New owner checklist (Dashboard)**

1. Complete business profile  
2. Add first court  
3. Generate slots for 14 days  
4. Set cancellation policy  
5. Create a membership plan (optional)  
6. Invite a staff member  
7. Go live on FitOra (approval status banner)

Each step deep-links to the owning module.

---

## 11. Alerts taxonomy

| Alert | Destination |
|-------|-------------|
| Double-booking / conflict | Calendar / Booking |
| Subscription past due | Subscription Billing |
| Low occupancy tomorrow | Slot Management / promos |
| Batch full | Academy |
| Low stock | Products |
| Trainer leave clash | Trainers + Academy |
| Payout failed (future) | Revenue |

---

## 12. Migration from `/owner`

| Current | Venue OS module |
|---------|-----------------|
| Owner dashboard | Dashboard |
| Revenue | Revenue |
| Bookings | Bookings |
| Courts / Slots | Slot Management + Calendar |
| Membership plans | Memberships |
| Training / trainers | Academy + Trainers + Kids |
| Settings | Settings |
| Reports | Reports |
| — | Products, Services, Printing, Customers, Loyalty, Staff, Subscription Billing, Multi Branch |

---

## 13. Delivery phases

### Phase A — Operate

Dashboard · Bookings · Calendar · Slot Management · Settings · Branch switcher (single branch)

### Phase B — Grow programs

Memberships · Academy · Kids · Trainers · Customers · Reports

### Phase C — Monetize & scale

Products · Services · Printing · Loyalty · Staff RBAC · Subscription Billing · Multi Branch

---

## 14. Open decisions

| Topic | Options | Recommendation |
|-------|---------|----------------|
| Calendar vs Slots | Merge vs separate | **Separate**: Calendar = operate; Slots = configure |
| Venue commerce | Own SKUs vs FitOra-only catalog | **Venue catalog** with optional marketplace publish |
| Loyalty vs Pulse | Venue-only vs platform | **Start venue rules**; sync earn to Pulse later |
| Commission display | In Revenue | Show FitOra fee line items clearly |
| Mobile Venue OS | Native vs PWA | **PWA check-in** first; full SaaS stays desktop |

---

## 15. Document control

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-07-13 | Court Owner Venue OS UX architecture — 19 modules |

**Out of scope:** Code, visual Figma, Super Admin Command internals.  
**Next:** Figma shell + Dashboard + Calendar + Slot generate wizard → implementation epics.
