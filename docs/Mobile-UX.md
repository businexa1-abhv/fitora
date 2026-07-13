# FitOra Mobile UX Specification

**Product:** FitOra — Sports Ecosystem Platform  
**Document:** `Mobile-UX.md`  
**Version:** 1.0  
**Status:** Design specification (no implementation)  
**Date:** July 13, 2026  
**Platform:** iOS · Android (Expo / React Native)  
**Design system:** Material Design 3 (Material You)  
**Related:** [`FITORA_V2_PRD.md`](./FITORA_V2_PRD.md)

---

## 1. Design intent

### 1.1 Experience goals

The FitOra mobile app must feel:

| Quality | Meaning in FitOra |
|---------|-------------------|
| **Modern** | MD3 surfaces, expressive type, motion with purpose, dynamic color support |
| **Fast** | Instant Home skeleton, optimistic UI, cached upcoming play, ≤3 taps to book |
| **Community-driven** | Friends, open games, squads, and feed are first-class—not bolted under “More” |

### 1.2 Brand feel (not Playo)

- **Warm athletic energy** — orange primary (FitOra brand), high-contrast surfaces, sport photography + bold type.
- **Orbit clarity** — Home is a personalized “mission control”; Explore discovers; Play acts; Store equips; Profile owns identity.
- **Social proof everywhere** — “Friends playing”, filled open games, academy buzz—without noisy gamification spam.

### 1.3 Primary users on mobile

1. **Players** — book, join games, buy gear  
2. **Parents** — kids programs, progress, payments  
3. Operators (owners/trainers) — **web-first** in V2; mobile may deep-link to web Control Rooms later  

---

## 2. Bottom navigation

### 2.1 Tab bar (5 destinations)

| Order | Tab | Icon concept (MD3) | Job |
|------:|-----|--------------------|-----|
| 1 | **Home** | Home / Dashboard | Personalized hub — continue, social, offers |
| 2 | **Explore** | Compass / Travel Explore | Discover venues, sports, events, people |
| 3 | **Play** | Sports / Stadium | Book, my games, check-in, open games |
| 4 | **Store** | Storefront | Shop, services, print, orders |
| 5 | **Profile** | Person | Passport, kids, memberships, wallet, settings |

### 2.2 Tab bar behavior

- **Material 3 Navigation Bar** — active indicator pill, labeled icons, elevation on scroll optional (`elevation` level 2).
- **Badges:**  
  - Play → upcoming check-in within 2h  
  - Store → cart count  
  - Profile → unread notifications  
- **Scroll-to-top** on re-tap of active tab.  
- **Safe area** respected; bar uses `surfaceContainer` in light / dark.  
- **Center emphasis:** Play may use a slightly stronger active color (primary) — it is the transactional core.

### 2.3 Why this IA (vs previous Training tab)

| Old (approx.) | New | Rationale |
|---------------|-----|-----------|
| Home / Search / Training / Store / Profile | Home / Explore / Play / Store / Profile | Training & kids surface on **Home + Explore**; Play owns booking lifecycle; Explore is discovery-wide |

Training is **content**, not a permanent thumb destination—parents still reach Kids Programs in ≤2 taps from Home.

---

## 3. Global app chrome

### 3.1 Top app bars

| Context | Pattern |
|---------|---------|
| Home | Large / medium collapsing title + city chip + notification + avatar |
| Explore | Search-first top bar (MD3 Search bar) + filter chips |
| Play | Segmented control or tabs: Book · My Games · Open Games |
| Store | Search + cart action |
| Profile | Title + settings gear |

### 3.2 Persistent context

**City + Sport** chip cluster (Home, Explore, Play):

- Tap city → searchable city sheet (India cities)  
- Tap sport → horizontal sport filter sheet  
- Context persists across tabs (app-level state)

### 3.3 System overlays

- Notifications center (push inbox)  
- Cart sheet / cart screen  
- Auth gate modals  
- MD3 **bottom sheets** for filters, slot pickers, share  

---

## 4. Navigation architecture

### 4.1 Root navigators

```
RootNavigator
├── AuthStack          (unauthenticated)
├── MainTabs           (authenticated — default)
│   ├── HomeStack
│   ├── ExploreStack
│   ├── PlayStack
│   ├── StoreStack
│   └── ProfileStack
├── ModalStack         (global modals — presented over tabs)
└── DeepLinkRouter
```

### 4.2 Stack responsibilities

| Stack | Owns |
|-------|------|
| **HomeStack** | Home feed only + “See all” destinations that keep Home as back target when opened from Home rails |
| **ExploreStack** | Discovery search, venue/event/program lists, maps |
| **PlayStack** | Booking flows, bookings list, open games, check-in |
| **StoreStack** | Shop, services, print, cart, checkout, orders |
| **ProfileStack** | Passport, kids, memberships, wallet, pulse, settings |
| **ModalStack** | Share, filters, slot confirm, QR check-in, quick create open game |

### 4.3 Cross-tab navigation rules

1. **Detail screens** pushed on the stack that initiated them (Venue from Explore stays in ExploreStack).  
2. **Transactional booking** always switches/pushes into **PlayStack** once user taps “Book slot” (single booking source of truth).  
3. **“See all” from Home** may push a shared list screen *or* jump tab + params (prefer jump tab for Explore/Play/Store to avoid duplicate hierarchies).  
4. Deep links resolve to the owning stack, then select the correct tab.

### 4.4 Navigation graph (high level)

```
                    ┌──────────── AuthStack ────────────┐
                    │  Welcome · Login · Register · OTP  │
                    └─────────────────┬─────────────────┘
                                      │
                    ┌─────────────────▼─────────────────┐
                    │             MainTabs               │
      ┌─────────────┼───────────┬───────────┬───────────┼─────────────┐
      │             │           │           │           │             │
   HomeStack   ExploreStack  PlayStack  StoreStack  ProfileStack
      │             │           │           │           │
      └─────────────┴───────────┴─────┬─────┴───────────┘
                                      │
                               ModalStack / Sheets
```

---

## 5. Screen hierarchy

### 5.1 AuthStack

```
AuthStack
├── Welcome
├── Login
├── Register
├── ForgotPassword
├── ResetPassword
└── OTPVerify (email/phone)
```

### 5.2 HomeStack

```
HomeStack
├── Home                          ← Tab root
├── HomeSeeAllNearbyVenues
├── HomeSeeAllEvents
├── HomeSeeAllPrograms
├── HomeSeeAllProducts
├── HomeSeeAllServices
├── CommunityFeedFull
└── FriendsPlayingList
```

> Prefer routing “See all” into Explore / Play / Store tabs when the destination is the canonical catalog (see §4.3). HomeSeeAll* screens are optional thin wrappers for analytics continuity.

### 5.3 ExploreStack

```
ExploreStack
├── ExploreHome                   ← Tab root (search + categories)
├── ExploreResults                ← query + facets
├── ExploreMap                    ← map-first venues
├── VenueDetail
│   └── VenueReviews
├── EventDetail
│   └── EventRegister (may hand off to Play/checkout modal)
├── ProgramDetail                 ← training program
├── TrainerPublicProfile
├── SquadPublicProfile
├── PlayerPublicProfile
└── CategoryLanding               ← e.g. “Badminton in Bangalore”
```

### 5.4 PlayStack

```
PlayStack
├── PlayHome                      ← Tab root (Book | My Games | Open Games)
├── VenueBooking                  ← date → slots → players
├── BookingCheckout
├── BookingConfirmation
├── BookingDetail
├── MyBookings                    ← upcoming / past filters
├── CheckIn                       ← QR / code
├── OpenGamesList
├── OpenGameDetail
├── CreateOpenGame
├── JoinOpenGame
└── GameSuggestionsDetail         ← “suggested for you” full list
```

### 5.5 StoreStack

```
StoreStack
├── StoreHome                     ← Tab root (Shop | Services | Print)
├── ProductList
├── ProductDetail
├── ServiceList
├── ServiceDetail
├── ServiceRequest
├── PrintList
├── PrintDetail
├── PrintDesignUpload
├── Cart
├── Checkout
├── OrderList                     ← unified Equip orders
├── OrderDetail
└── Wishlist
```

### 5.6 ProfileStack

```
ProfileStack
├── ProfileHome                   ← Tab root (Passport summary)
├── SportPassport
├── EditProfile
├── MyKids
│   ├── KidDetail
│   └── AddEditKid
├── Memberships
│   ├── PlanBrowse
│   └── MembershipDetail
├── Wallet
├── PulseRewards
├── PaymentsHistory
├── Notifications
├── NotificationSettings
├── AccountSettings
├── SecurityChangePassword
├── Appearance                    ← Light / Dark / System
├── HelpSupport
└── ControlRoomLinks              ← optional “Open Venue OS” (web)
```

### 5.7 ModalStack (global)

```
ModalStack
├── CityPicker
├── SportPicker
├── FilterSheet (venues / events / store)
├── ShareSheet
├── SlotQuickPick
├── PaymentSheet
├── CheckInModal
├── CreateOpenGameModal
├── RatingPrompt
└── ForceUpdate / Maintenance
```

---

## 6. Home screen — detailed composition

Home is a **vertical, personalized, community-aware feed** composed of modular rails.  
Order below is the **default**; personalization may reorder based on role (parent vs solo player) and context (has upcoming booking → Continue Booking rises).

### 6.1 Layout anatomy

```
┌─────────────────────────────────────────┐
│  TopAppBar: FitOra · City · 🔔 · Avatar │
├─────────────────────────────────────────┤
│  Greeting                               │
│  Quick Actions (chips / FABs row)       │
├─────────────────────────────────────────┤
│  Continue Booking (conditional)         │
│  Upcoming Games                         │
│  Friends Playing                        │
│  Nearby Venues                          │
│  Game Suggestions                       │
│  Training                               │
│  Kids Programs                          │
│  Featured Events                        │
│  Membership Offers                      │
│  Store Products                         │
│  Services                               │
│  Community Feed                         │
│  …                                      │
└─────────────────────────────────────────┘
│           MD3 Navigation Bar            │
└─────────────────────────────────────────┘
```

### 6.2 Section specifications

#### A. Greeting

| Field | Spec |
|-------|------|
| Content | Time-based hello + first name (“Good evening, Sri”) |
| Subline | City · primary sport · Pulse tier chip (optional) |
| Parent mode | If kids linked: “Aarav has training tomorrow” soft prompt |
| Interaction | Avatar → Profile; Pulse chip → PulseRewards |

#### B. Quick Actions

Horizontal MD3 **Assist chips** / icon buttons:

- Book court  
- Find players  
- My bookings  
- Kids  
- Wallet  
- Scan check-in  

Max 6 visible; overflow → “More” sheet.

#### C. Continue Booking

| Rule | Show if incomplete booking draft or recently viewed venue with available slots today/tomorrow |
| UI | Compact MD3 card: venue thumb, sport, CTA **Resume** |
| Empty | Hide section entirely |

#### D. Upcoming Games

| Content | Next 1–3 confirmed bookings + joined open games |
| UI | Horizontal cards: date/time, venue, status, **Check in** when eligible |
| CTA | See all → Play → My Games |

#### E. Friends Playing

| Content | Friends/squad mates with public “playing soon” or live check-in (privacy opt-in) |
| UI | Avatar stack + “3 friends at Smash Arena · 7:00 PM” |
| CTA | View → FriendsPlayingList / OpenGameDetail |
| Empty | Soft empty: “Invite friends to FitOra” |

#### F. Nearby Venues

| Content | Geo/city venues ranked by distance + availability tonight |
| UI | Horizontal venue cards (photo, sport chips, price from, rating) |
| CTA | Card → VenueDetail (ExploreStack or shared); See all → Explore |

#### G. Game Suggestions

| Content | Open games + AI/rule-based suggestions (“Doubles needed · Intermediate · 2km”) |
| UI | List rows with sport icon, spots left, join CTA |
| CTA | Join → PlayStack open game flow |

#### H. Training

| Content | Featured adult/coaching programs near user |
| UI | Horizontal program cards |
| CTA | ProgramDetail |

#### I. Kids Programs

| Visibility | Prioritize / pin higher for parent profiles |
| Content | Age-appropriate batches |
| UI | Cards with age band, schedule, academy/venue |
| CTA | ProgramDetail → enroll |

#### J. Featured Events

| Content | City events / tournaments |
| UI | Large featured card + horizontal strip |
| CTA | EventDetail |

#### K. Membership Offers

| Content | Plans with discount / venue-specific offers |
| UI | Offer cards with price & benefit bullets |
| CTA | PlanBrowse / MembershipDetail |

#### L. Store Products

| Content | Trending / sport-contextual SKUs |
| UI | Product grid/rail |
| CTA | ProductDetail (StoreStack) |

#### M. Services

| Content | Stringing, repair, rental near city |
| UI | Service cards |
| CTA | ServiceDetail |

#### N. Community Feed

| Content | Squad posts, open game creates, event shares, friend check-ins (lightweight) |
| UI | MD3 list / cards with avatar, text, media optional, social actions |
| CTA | Open full CommunityFeedFull; composer later (P1) |
| Empty | Prompts to create open game or join squad |

### 6.3 Home loading & performance UX

1. **Cached first paint** — Greeting + Upcoming Games from local cache &lt; 100ms.  
2. **Section skeletons** — independent rails; no single full-page blocker.  
3. **Staggered fetch** — Critical (upcoming, continue) → Social → Commerce.  
4. **Pull-to-refresh** refreshes all rails.  
5. **Prefetch** VenueDetail for first Nearby card on idle.

### 6.4 Home personalization rules (summary)

| Signal | Effect |
|--------|--------|
| Has kid profiles | Kids Programs rises above Training |
| Has booking in &lt; 24h | Upcoming + Check-in Quick Action emphasized |
| Sport context = Cricket | Rails bias cricket venues/products/events |
| New user (&lt; 3 days) | Onboarding tips replace Community until first book |

---

## 7. Tab root screens (non-Home)

### 7.1 Explore

**Purpose:** Answer “What’s around me in sports?”

**Modules:**

1. MD3 Search bar (“Venues, events, academies, players”)  
2. Category tiles: Venues · Events · Training · People · Map  
3. Trending in city  
4. Sport chips  
5. Recent searches  

**Results** support facets: sport, distance, price, rating, amenities, date (events), age group (kids).

### 7.2 Play

**Purpose:** Answer “When and where do I play—and with whom?”

**Top segments:**

| Segment | Content |
|---------|---------|
| **Book** | Shortcut to search venues / last booked / nearby with slots |
| **My Games** | Upcoming & past bookings; check-in entry |
| **Open Games** | Community games to join or create |

Primary CTA on Book: **Find a court** → Explore or inline venue search → VenueBooking.

### 7.3 Store

**Purpose:** Equip for sport.

**Top segments:** Shop · Services · Print  

Shared: search, cart, orders entry.  
Sport-contextual merchandising from Profile Passport.

### 7.4 Profile

**Purpose:** Identity, family, money, settings.

**Modules:**

- Sport Passport header (avatar, sports, Pulse tier)  
- Shortcuts: Bookings, Kids, Memberships, Wallet, Pulse, Orders, Notifications  
- Appearance (theme)  
- Account & security  
- Sign out  

---

## 8. Key user flows (navigation paths)

### 8.1 Book a court

```
Home / Explore / Play(Book)
  → VenueDetail
  → VenueBooking (date/slots)
  → BookingCheckout
  → PaymentSheet
  → BookingConfirmation
  → [optional] CreateOpenGameModal
```

### 8.2 Join friends playing

```
Home (Friends Playing)
  → OpenGameDetail
  → JoinOpenGame
  → (pay share if required)
  → My Games
```

### 8.3 Enroll kid

```
Home (Kids Programs) or Explore
  → ProgramDetail
  → Select batch
  → Checkout (training fee)
  → Kid enrollment confirmation
  → Profile → MyKids
```

### 8.4 Buy gear

```
Home (Store Products) or Store
  → ProductDetail
  → Cart
  → Checkout
  → OrderDetail
```

### 8.5 Check in

```
Play (My Games) / Home Quick Action / Push
  → CheckInModal
  → Success → rate venue prompt (deferred)
```

---

## 9. Modern UX — Material Design 3

### 9.1 Adopted MD3 patterns

| Pattern | Usage |
|---------|--------|
| **Color roles** | primary, onPrimary, primaryContainer, surface, surfaceContainer*, outline, error |
| **Dynamic color** | Optional Android Material You; FitOra orange seed as fallback brand |
| **Typography** | Display/title for Greeting; titleMedium cards; body for feed; label for chips |
| **Shape** | 12–28dp rounded corners; full-round chips; FAB only if needed (Play create) |
| **Elevation** | Tonal surfaces over heavy shadows; cards use `surfaceContainerLow` |
| **Navigation bar** | Standard 5 destinations |
| **Top app bar** | Small / medium / large as per tab |
| **Sheets** | Modal bottom sheets for pickers |
| **Buttons** | Filled (primary CTA), Tonal, Outlined, Text |
| **Motion** | Shared axis for tab switches; container transform for cards → detail; respect reduced motion |

### 9.2 Component inventory (design-level)

- Venue card, Event card, Program card, Product card, Service card  
- Open game row, Friend activity row, Feed post  
- Membership offer card, Quick action chip  
- Slot grid, Check-in QR panel  
- Empty states, error states, skeleton rails  

### 9.3 Motion principles

- Fast: 200–300ms standard transitions  
- Booking confirmation: celebratory but short (confetti optional, disable if reduced motion)  
- Home rails: fade+slide up on first load only  

### 9.4 Accessibility (mobile)

- Min touch target 48×48 dp  
- Dynamic type support (MD3 type scale)  
- Contrast ≥ WCAG AA for text on surfaces  
- Screen reader labels on icon-only actions  
- Don’t rely on color alone for booking status  

---

## 10. Dark mode

### 10.1 Modes

| Setting | Behavior |
|---------|----------|
| **System** | Follow OS (default) |
| **Light** | Force light |
| **Dark** | Force dark |

Stored in Profile → Appearance; applied via theme provider.

### 10.2 Dark theme rules

- Use MD3 dark surface ladder (`surface` → `surfaceContainerHighest`), not flat #000 everywhere.  
- Primary orange desaturates slightly on dark for eye comfort; containers stay vibrant for CTAs.  
- Images: subtle scrim on text overlays.  
- Elevation: prefer tonal layering; avoid harsh white borders.  
- Status colors (success/warning/error) tuned for dark contrast.  
- Navigation bar and Home background stay visually continuous (no jarring seams).

### 10.3 Assets

- Prefer single illustrative assets with safe margins; avoid light-only PNGs.  
- Sport emoji/icons via vector; photos from CDN with dark-friendly crops.

---

## 11. Content & empty states

| Surface | Empty state message direction |
|---------|--------------------------------|
| Upcoming Games | “No games yet — book a court or join an open game” |
| Friends Playing | “Your crew’s quiet — invite friends” |
| Community Feed | “Be the first to post an open game in your city” |
| Cart | “Your kit bag is empty” |
| Kids | “Add a child profile to browse academies” |

Tone: encouraging, sporty, concise—never blame the user.

---

## 12. Notifications → screen mapping

| Notification type | Opens |
|-------------------|--------|
| Booking confirmed / reminder | BookingDetail / CheckIn |
| Open game filled / joined | OpenGameDetail |
| Training attendance / reminder | ProgramDetail / KidDetail |
| Order shipped | OrderDetail |
| Event registration | EventDetail |
| Social (friend invite) | Squad / Profile public |

---

## 13. Analytics events (UX-relevant)

- `home_section_impression` (section_id)  
- `home_section_cta` (section_id, target)  
- `tab_selected` (tab)  
- `quick_action_tap` (action)  
- `theme_changed` (mode)  
- Funnel: `book_start` → `slot_select` → `pay_success`  

---

## 14. Phased UX delivery

### Phase 1 — Navigation + Home skeleton

- 5-tab IA  
- Home: Greeting, Quick Actions, Continue, Upcoming, Nearby, Store rail  
- Dark mode + MD3 theme tokens  
- Explore/Play/Store/Profile root shells  

### Phase 2 — Community density

- Friends Playing, Game Suggestions, Community Feed  
- Open Games in Play  
- Kids Programs rail + parent ordering  

### Phase 3 — Polish

- Map Explore  
- Pulse on Home  
- Personalized rail ranking  
- Advanced motion / shared element transitions  

---

## 15. Screen inventory checklist

**Auth (5)** · **Home (+ see-alls) (8)** · **Explore (10)** · **Play (12)** · **Store (13)** · **Profile (16)** · **Modals (10)**  

Approximate **~70 screens/sheets** in full hierarchy; MVP ships roots + booking + store checkout + profile core first.

---

## 16. Open design decisions

| Topic | Options | Recommendation |
|-------|---------|----------------|
| Home “See all” | Stay in HomeStack vs switch tab | **Switch tab** for catalogs; stay for social lists |
| Play default segment | Book vs My Games | **My Games** if upcoming exists, else **Book** |
| Store default segment | Shop vs last-used | **Shop**, remember last segment |
| Community composer | Home vs Play | **Play → Create Open Game** for MVP |
| Training discovery | Explore only vs Home rail | **Both** — rail + Explore category |

---

## 17. Document control

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-07-13 | Initial mobile UX: 5-tab IA, Home composition, MD3 + dark mode, full hierarchy |

**Out of scope for this document:** UI code, component implementations, API contracts.  
**Next:** Visual design (Figma MD3 library) → interaction prototypes → implementation tickets.
