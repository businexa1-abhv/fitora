# FitOra Web UX Specification

**Product:** FitOra — Sports Ecosystem Platform  
**Document:** `Web-UX.md`  
**Version:** 1.0  
**Status:** Design specification (no implementation)  
**Date:** July 13, 2026  
**Platform:** Responsive Web (Next.js)  
**Related:** [`FITORA_V2_PRD.md`](./FITORA_V2_PRD.md) · [`Mobile-UX.md`](./Mobile-UX.md)

---

## 1. Design intent

### 1.1 Web’s job in the ecosystem

| Surface | Role |
|---------|------|
| **Public marketing + SEO** | Acquire demand & supply; city/sport landings; blogs |
| **Consumer web app** | Full Orbit experience for players & parents (parity with mobile core) |
| **Partner registration** | Onboard venues, academies, vendors, organizers, corporates |
| **Support** | Help center + contact |
| **Control Rooms** (linked) | Operator ops remain role shells; web consumer chrome switches into them |

Mobile is the daily driver for play; **web owns discovery depth, SEO, corporate, partner signup, content, and complex booking/admin-adjacent tasks**.

### 1.2 Experience principles

1. **Module clarity** — Each top-level module has one job; Marketplace ≠ Services ≠ Community.  
2. **City + sport context** — Persistent across discovery modules.  
3. **Fast paths** — Book a venue in ≤4 steps from landing.  
4. **Trust** — Ratings, photos, policies, partner verification badges.  
5. **Responsive-first** — Desktop for density; mobile web mirrors IA without forcing app download (soft prompts OK).

### 1.3 Modules in scope (this doc)

1. Venue Discovery  
2. Bookings  
3. Academies  
4. Events  
5. Marketplace  
6. Services  
7. Corporate Sports  
8. Community  
9. Blogs  
10. Support  
11. Partner Registration  

---

## 2. Navigation

### 2.1 Global header (authenticated & public)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [F FitOra]  Venues  Academies  Events  Marketplace  Services  Community │
│                         [City ▾] [Sport ▾]     🔔  Cart  [Avatar ▾]     │
└──────────────────────────────────────────────────────────────────────────┘
```

| Item | Destination | Notes |
|------|-------------|-------|
| Logo | `/` | Home / Orbit hub |
| Venues | `/venues` | Venue Discovery |
| Academies | `/academies` | Kids & coaching |
| Events | `/events` | Tournaments & leagues |
| Marketplace | `/marketplace` | Gear shop |
| Services | `/services` | Repair, stringing, rental |
| Community | `/community` | Squads, open games, feed |
| City | Sheet / menu | Persists globally |
| Sport | Sheet / menu | Filters discovery defaults |
| Bell | `/notifications` | Auth only |
| Cart | `/marketplace/cart` | Badge count |
| Avatar | Account menu | Passport, bookings, orders, settings, Control Room |

**Secondary / utility links** (footer or “More” on compact header):

- Corporate Sports → `/corporate`  
- Blogs → `/blog`  
- Support → `/support`  
- Partner Registration → `/partners`  
- Memberships → `/memberships` (can also live under Venues or Account)

### 2.2 Header responsive behavior

| Breakpoint | Behavior |
|------------|----------|
| **≥1200px** | Full module links visible |
| **768–1199px** | Primary 5 modules + “More” mega/dropdown (Community, Corporate, Blog, Support, Partners) |
| **&lt;768px** | Hamburger + bottom utility optional; logo, city, avatar always visible; cart icon |

### 2.3 Account menu

- Sport Passport / Account  
- My Bookings  
- My Academies (kids enrollments)  
- My Events  
- Orders (marketplace + services)  
- Memberships  
- Wallet / Pulse  
- Settings  
- **Switch to Control Room** (if owner/trainer/vendor/organizer/corp roles)  
- Sign out  

### 2.4 Footer IA

| Column | Links |
|--------|-------|
| Discover | Venues, Academies, Events, Community |
| Get gear | Marketplace, Services, Print (if under Marketplace or Services) |
| For business | Partner Registration, Corporate Sports, List your venue |
| Company | Blog, Support, About, Careers (optional) |
| Legal | Privacy, Terms, Refunds |

---

## 3. Sitemap

### 3.1 Public & marketing

```
/
├── /venues                          Venue Discovery (index)
│   ├── /venues/[slugOrId]           Venue detail
│   └── /venues/[slugOrId]/reviews
├── /academies                       Academies index
│   ├── /academies/[id]              Academy / program detail
│   └── /academies/[id]/batches/[batchId]
├── /events                          Events index
│   ├── /events/[id]                 Event detail
│   └── /events/[id]/register
├── /marketplace                     Marketplace home
│   ├── /marketplace/c/[category]
│   ├── /marketplace/p/[slug]        Product detail
│   ├── /marketplace/cart
│   ├── /marketplace/checkout
│   └── /marketplace/wishlist
├── /services                        Services index
│   ├── /services/[id]               Service listing detail
│   └── /services/request/[id]       Request / checkout
├── /community                       Community home
│   ├── /community/feed
│   ├── /community/squads
│   ├── /community/squads/[id]
│   ├── /community/open-games
│   └── /community/open-games/[id]
├── /corporate                       Corporate Sports landing
│   ├── /corporate/demo
│   └── /corporate/login             (or SSO start)
├── /blog                            Blog index
│   ├── /blog/[slug]                 Article
│   └── /blog/category/[slug]
├── /support                         Support home
│   ├── /support/articles/[slug]
│   ├── /support/contact
│   └── /support/tickets             (auth)
├── /partners                        Partner Registration hub
│   ├── /partners/venue
│   ├── /partners/academy
│   ├── /partners/vendor             (services / print)
│   ├── /partners/organizer
│   └── /partners/corporate
├── /memberships
├── /cities/[city]
├── /sports/[sport]
├── /login
├── /register
└── /legal/{privacy|terms|refunds}
```

### 3.2 Authenticated consumer app

```
/account                             Profile / Passport
/settings
/bookings                            My bookings list
/bookings/[id]                       Booking detail + check-in
/bookings/[id]/checkout              (or /venues/.../book)
/orders                              Unified orders hub
/orders/[id]
/wallet
/pulse
/notifications
/notifications/settings
/kids
/kids/[id]
/kids/new
```

### 3.3 Booking flow routes (canonical)

```
/venues/[id]
  → /venues/[id]/book                Date + slots
  → /venues/[id]/book/checkout       Pay
  → /bookings/[id]/confirmed         Confirmation
```

### 3.4 Partner post-submit

```
/partners/status                     Application pending
/ops/*                               Control Rooms (existing/migrated shells)
/admin                               Super Admin (separate app or subdomain)
```

### 3.5 Sitemap XML priorities (SEO)

| Path pattern | Priority | Changefreq |
|--------------|----------|------------|
| `/`, `/venues`, `/cities/*`, `/sports/*` | 1.0–0.9 | daily |
| `/venues/[id]`, `/academies/[id]`, `/events/[id]` | 0.8 | weekly |
| `/blog`, `/blog/[slug]` | 0.7 | weekly |
| `/corporate`, `/partners` | 0.6 | monthly |
| Auth-only `/bookings`, `/account` | **noindex** | — |

---

## 4. Module briefs & wireframe descriptions

Wireframes are **structural descriptions** (layout zones), not pixel specs.

### 4.1 Venue Discovery

**Purpose:** Find and evaluate places to play.

**Index `/venues` wireframe**

```
[Header]
[Hero strip: title + city/sport + search]
[Filter bar: sport | price | amenities | indoor/outdoor | rating | available tonight]
[Results meta: count · sort]
┌──────────────┬─────────────────────────────────────┐
│ Filters      │ Results grid (3-col desktop / 1 mob) │
│ (desktop)    │ VenueCard: image, name, sports,     │
│              │ distance, from-price, rating, CTA   │
└──────────────┴─────────────────────────────────────┘
[Map toggle → split view map | list]
```

**Detail `/venues/[id]`**

```
[Gallery full-bleed]
[Title · sports chips · rating · city]
[Primary CTA: Book a slot] [Secondary: Save / Share]
[Tabs: Overview | Amenities | Pricing | Reviews | Training at venue | Events]
[Sticky booking rail on desktop right: date picker teaser + Book]
[Nearby / similar venues]
```

### 4.2 Bookings

**Purpose:** Reserve, pay, manage, check in.

**Flow pages**

1. **Book** — calendar, slot grid (available/peak/member), duration, court picker if multi-court.  
2. **Checkout** — summary, membership benefit, Pulse redeem, UPI/Razorpay, cancellation policy.  
3. **Confirmation** — code/QR, add to calendar, “Find players” → Community open game.  
4. **My Bookings** — upcoming / past / cancelled; filters; detail with cancel/reschedule policy UI.

**List wireframe `/bookings`**

```
[Title: My bookings]
[Segments: Upcoming | Past | Cancelled]
[Cards: venue, sport, time, status pill, Check in / View]
```

### 4.3 Academies

**Purpose:** Discover coaching & kids programs; enroll.

**Index `/academies`**

```
[Hero: Kids & coaching]
[Filters: sport | age group | city | daypart | fee range]
[Grid: ProgramCard — academy, age band, schedule snippet, fee, CTA]
[Parent callout: “Track attendance & progress”]
```

**Detail**

```
[Program hero]
[About · curriculum · coaches · batches table]
[Batch select → Enroll CTA]
[Reviews · FAQ · venue map]
```

**Enroll** — kid selector / create kid → fee → pay → success → link to progress.

### 4.4 Events

**Purpose:** Browse and register for tournaments/leagues.

**Index `/events`**

```
[Featured carousel]
[Filters: sport | date | city | fee | skill level]
[List/grid EventCard: date badge, title, venue, spots, CTA]
```

**Detail**

```
[Event hero + status (Open / Closing soon / Full)]
[Overview | Divisions | Schedule | Prizes | Rules]
[Register panel sticky: division select, fee, team/solo]
[Related: gear kit, nearby stay (future)]
```

### 4.5 Marketplace

**Purpose:** Sports e-commerce (gear, apparel).

**Home `/marketplace`**

```
[Search]
[Category chips]
[Promo banners]
[Rails: Trending | Sport context | New arrivals]
[Trust: delivery / returns strip]
```

**Product detail** — gallery, variants, price, delivery ETA, reviews, add to cart.  
**Cart / Checkout** — address, payment, order summary.  
**Print** may appear as category or sibling under Marketplace nav “Kits & Print” depending on IA preference; default: Print listings linked from Services *or* Marketplace “Custom print” entry (see open decisions).

### 4.6 Services

**Purpose:** Stringing, repair, rental, equipment care.

**Index**

```
[Service category tiles]
[City-aware listings]
[How it works: Request → Accept → Done]
[Listing cards: provider, turnaround, price from, rating]
```

**Detail / request** — scope form, photos upload, schedule, pay or pay-on-accept (policy), status tracker.

### 4.7 Corporate Sports

**Purpose:** B2B wellness — credits, leagues, employee play.

**Landing `/corporate`**

```
[Hero: Sports that build teams]
[Value props: credits | leagues | analytics]
[Logos / social proof]
[CTA: Book demo | Partner as corporate]
[Feature sections: HR dashboard mock | employee app path]
[FAQ]
```

**Post-sale (auth corp role)** → Control Room `/ops/corp` (not fully designed here; link out).

### 4.8 Community

**Purpose:** Squads, open games, feed — web social layer.

**Home `/community`**

```
[Segments: Feed | Open Games | Squads]
[Composer (auth): post / create open game]
[Feed cards]
[Right rail desktop: Friends playing · Suggested squads · Trending open games]
```

**Open game detail** — roster, skill, venue/time, Join CTA → may attach booking.  
**Squad** — members, posts, upcoming plays.

### 4.9 Blogs

**Purpose:** SEO + education + brand.

**Index `/blog`**

```
[Featured post]
[Categories: Training | Nutrition | Venue guides | Product]
[Post grid: image, title, excerpt, read time]
```

**Article** — readable type scale, TOC on desktop, related venues/events modules (contextual CTAs), share.

### 4.10 Support

**Purpose:** Deflect + resolve.

**Home `/support`**

```
[Search articles]
[Category cards: Bookings | Payments | Academies | Partners | Account]
[Contact CTA]
[Status: system status optional]
```

**Contact / tickets** — form; auth users see ticket history.

### 4.11 Partner Registration

**Purpose:** Supply acquisition.

**Hub `/partners`**

```
[Choose path cards]
  Venue owner | Academy | Service / Print vendor | Event organizer | Corporate
[Benefits per path]
[Trust: KYC / approval timeline]
```

**Per-path multi-step form**

1. Account / business info  
2. Location & sports  
3. Documents / images  
4. Review & submit  
5. Status page (pending approval)

Success → email + `/partners/status`; after approval → Control Room invite.

---

## 5. User flows

### 5.1 Guest → book first venue

```
Landing /venues
  → set City + Sport
  → Venue detail
  → Book slot (prompt login/register if needed)
  → Checkout + pay
  → Confirmation
  → Optional: download app banner / create open game
```

### 5.2 Parent → enroll child

```
/academies
  → filter age + sport
  → program detail
  → select batch
  → login
  → add kid profile
  → pay fee
  → enrollment active
  → /kids/[id] progress
```

### 5.3 Player → join event

```
/events
  → event detail
  → select division
  → register + pay
  → confirmation + calendar
  → community share
```

### 5.4 Player → buy gear after booking

```
Booking confirmation module “Recommended gear”
  → product detail
  → add to cart
  → checkout
  → /orders/[id]
```

### 5.5 Player → request stringing

```
/services
  → listing detail
  → request form + photos
  → pay / request
  → track status in /orders
```

### 5.6 Player → find people to play

```
/community/open-games
  → filter sport/time
  → open game detail
  → join (auth)
  → linked booking or meetup instructions
```

### 5.7 HR → explore corporate

```
/corporate
  → Book demo form
  → sales follow-up (external)
  OR /partners/corporate application
```

### 5.8 Owner → become partner

```
/partners
  → Venue path
  → multi-step registration
  → pending approval
  → admin approves
  → email magic link → Venue OS
```

### 5.9 User → get help

```
/support
  → search article
  → resolve
  OR contact / ticket
  → email confirmation
```

### 5.10 Reader → blog → conversion

```
/blog/[slug] (e.g. “Best badminton venues in Pune”)
  → contextual venue module
  → /venues?city=Pune&sport=Badminton
  → book flow
```

---

## 6. Responsive behavior

### 6.1 Breakpoints

| Token | Width | Target |
|-------|-------|--------|
| `sm` | ≥640px | Large phones landscape |
| `md` | ≥768px | Tablet |
| `lg` | ≥1024px | Laptop |
| `xl` | ≥1280px | Desktop |
| `2xl` | ≥1536px | Wide |

### 6.2 Pattern matrix

| Pattern | Mobile (&lt;768) | Tablet | Desktop (≥1024) |
|---------|------------------|--------|-----------------|
| **Header** | Hamburger + city + avatar | Condensed links | Full nav |
| **Venue filters** | Bottom sheet | Collapsible top | Left sticky sidebar |
| **Venue results** | 1-col cards | 2-col | 3-col + optional map split |
| **Venue detail CTA** | Sticky bottom bar Book | Sticky bottom | Right sticky rail |
| **Booking slots** | Vertical day + scroll grid | Same | Side-by-side calendar + grid |
| **Marketplace** | 2-col product grid | 3-col | 4-col |
| **Community** | Single column feed | Feed | Feed + right rail |
| **Corporate / Partners** | Stacked sections | Same | 2-col hero + form |
| **Blog article** | Fluid type | Same | Max-width ~720px + TOC |
| **Tables** (batches, divisions) | Cardized rows | Horizontal scroll | Full table |
| **Footer** | Accordion columns | 2-col | 4–5 col |

### 6.3 Interaction rules

- Touch targets ≥44px on mobile web.  
- Hover states desktop-only; keyboard focus visible everywhere.  
- Map view: full-screen on mobile; split ≥1024.  
- Modals → full-screen sheets on small viewports.  
- Avoid hover-only mega-menus; click/tap to open.

### 6.4 Performance UX (responsive)

- Priority image sizes per breakpoint.  
- Filter changes: soft navigation / URL query sync for shareable discovery links.  
- Infinite scroll on mobile lists; paginate on desktop optional.

---

## 7. Cross-module navigation map

```
Venues ──book──► Bookings ──share──► Community (open game)
   │                 │
   ├──training──────► Academies
   └──hosts─────────► Events

Events ──kit──► Marketplace / Services (print)
Academies ──kit──► Marketplace
Bookings ──upsell──► Marketplace / Memberships
Blog ──CTA──► Venues / Academies / Events
Partners ──approve──► Control Rooms
Corporate ──employees──► Venues / Events / Community
Support ◄── all modules (contextual help links)
```

---

## 8. Shared UI patterns (web)

| Pattern | Usage |
|---------|--------|
| **Discovery shell** | Search + filters + results + sort (Venues, Academies, Events, Marketplace, Services) |
| **Entity hero** | Gallery, title, chips, rating, primary CTA |
| **Sticky CTA** | Book / Enroll / Register / Add to cart |
| **Status pills** | Booking, order, enrollment, event registration |
| **Auth gate** | Modal or redirect with return URL |
| **Empty states** | Module-specific illustration + CTA |
| **Trust strip** | Payments, cancellation, verified partner |

Visual language: align with FitOra orange brand + MD-inspired density on web (not a literal Material port). Dark mode: follow system / user setting (parity with mobile Appearance).

---

## 9. SEO & content modules

- Unique H1 per discovery index and entity page.  
- City + sport landing templates (`/cities/[city]`, `/sports/[sport]`).  
- Blog as content engine feeding discovery CTAs.  
- Structured data: LocalBusiness (venues), Event, Product, Article.  
- Canonical URLs; prevent duplicate `/courts` vs `/venues` via redirects (migration).

---

## 10. Access control (page level)

| Area | Guest | Player/Parent | Partner applicant | Operator roles |
|------|-------|---------------|-------------------|----------------|
| Discovery modules | Read | Read + act | Read | Read |
| Book / enroll / register | Gate at checkout | Full | Full | Full |
| Community write | Gate | Full | Full | Full |
| Corporate landing | Read | Read | Read | Corp Hub if role |
| Partner forms | Submit | Submit | Status | — |
| `/bookings`, `/account` | Redirect login | Full | Full | Full |
| Control Rooms | Deny | Deny | Pending | Role shell |

---

## 11. Open decisions

| Topic | Options | Recommendation |
|-------|---------|----------------|
| Print IA | Under Marketplace vs Services vs own nav | **Marketplace “Custom kits” + Services cross-link** to avoid 7th header item |
| Memberships in header | Top-level vs under Venues | **Account + Venues upsell**; footer link |
| Community vs Play naming | Web “Community” vs mobile social inside Home/Play | Keep **Community** on web for clarity |
| `/courts` legacy | Redirect vs dual | **301 → `/venues`** |
| Corporate app | Same origin vs subdomain | **Same origin `/corporate` + `/ops/corp`** |

---

## 12. Delivery phases (web UX)

### Phase 1 — Foundation

- Header/footer IA + `/venues` rename/redirect  
- Bookings flows hardened  
- Partner Registration hub (venue + vendor)  
- Support + Blog basics  

### Phase 2 — Ecosystem

- Academies web IA polish  
- Events listing + register  
- Community feed + open games  
- Marketplace/Services unified chrome  

### Phase 3 — B2B & content scale

- Corporate Sports landing + demo  
- Blog SEO program  
- Map split discovery  
- Cross-module upsell modules  

---

## 13. Document control

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-07-13 | Web modules, sitemap, flows, wireframes, nav, responsive |

**Out of scope:** High-fidelity visuals, component code, Control Room internal UX (separate ops doc).  
**Next:** Figma sitemap → key wireframes (Venues, Book, Partners, Corporate) → implementation epics.
