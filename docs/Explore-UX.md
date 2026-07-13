# FitOra Explore — UX Design

**Product:** FitOra Explore (Discovery Hub)  
**Document:** `Explore-UX.md`  
**Version:** 1.0  
**Status:** UX specification (no implementation)  
**Date:** July 13, 2026  
**Surfaces:** Mobile Explore tab · Web `/explore` (and module deep links)  
**Related:** [`Mobile-UX.md`](./Mobile-UX.md) · [`Web-UX.md`](./Web-UX.md) · [`FITORA_V2_PRD.md`](./FITORA_V2_PRD.md)

---

## 1. Vision

### 1.1 Job of Explore

**Explore** answers: *“What should I do in sports around me?”*

It is the discovery engine across Orbits—venues, events, academies, people (trainers), commerce, and services—under one **search + filters + map + personalized rails** experience.

Unlike Home (personalized mission control) or Play (transactional matches), Explore is **browse-first, intent-flexible**.

### 1.2 Principles

1. **City + sport first** — Every result is scoped; empty city is not allowed after onboarding.  
2. **One search box, many entity types** — Unified search with typed results.  
3. **Rails for inspiration, tools for precision** — Trending/featured rails + Filters + Map.  
4. **Save what you love** — Favorites + Collections for later.  
5. **Fast to action** — Every card has a primary verb (Book, View, Enroll, Shop, Request).  
6. **Parity with honesty** — Mobile and web share IA; web adds density (split map).

---

## 2. Information architecture

### 2.1 Entry points

| Surface | Entry |
|---------|--------|
| Mobile | Bottom tab **Explore** |
| Web | Header discovery / `/explore` · also feeds Venues/Events/… “Explore” modes |
| Home | “See all” on Nearby / Events / Products → Explore with preset |
| Deep link | `/explore?city=&sport=&type=` |

### 2.2 Explore home structure

```
┌─────────────────────────────────────────┐
│ Search bar                              │
│ City chip · Sport chip · Filter · Map   │
├─────────────────────────────────────────┤
│ Category shortcuts (optional row)       │
├─────────────────────────────────────────┤
│ Recommendations                         │
│ Nearby Venues                           │
│ Trending Sports                         │
│ Trending Events                         │
│ Popular Trainers                        │
│ Kids Academies                          │
│ Top Rated Venues                        │
│ Featured Products                       │
│ Sports Services                         │
│ Printing                                │
│ Collections (yours + editorial)         │
└─────────────────────────────────────────┘
```

Rail order is **default**; personalization may promote Kids Academies for parents, Products after a booking, etc.

### 2.3 Category shortcuts (chips)

Venues · Events · Academies · Trainers · Shop · Services · Print · Open Matches (handoff to Play)

Tapping a category opens **Results** with `type` filter locked + relevant facets.

---

## 3. Global chrome on Explore

### 3.1 Search bar

**Placeholder examples:**  
“Venues, events, academies, products…”  
“Try ‘badminton Indiranagar’”

**Behavior**

- Tap → Search mode (recent + suggestions)  
- Debounced query; Enter/Search submits  
- Voice search optional (P2)  
- Clear “×” always visible when non-empty  

### 3.2 Context chips

| Chip | Action |
|------|--------|
| **City** | Opens city picker (searchable India cities) |
| **Sport** | Sport sheet; “All sports” allowed on Explore |
| **Filters** | Opens filter sheet; badge = active count |
| **Map** | Toggles map mode / opens map screen |

### 3.3 Results vs Home

| Mode | When |
|------|------|
| **Explore Home** | No active query; optional soft filters only |
| **Results** | Query and/or hard filters / category / map browse |
| **Entity detail** | Pushed stack (venue, event, …) |

---

## 4. Module / rail UX

### 4.1 Nearby Venues

**Purpose:** Geo/city-proximate places to play.

**Card:** Cover image, name, sports chips, distance or area, “from ₹”, rating, availability hint (“3 slots tonight”).  
**Primary CTA:** View → Venue detail → Book.  
**See all:** Results `type=venue` sorted by distance.  
**Empty:** Expand radius / change city / “List your venue” (partner).

### 4.2 Trending Sports

**Purpose:** What the city is playing now (not a venue list).

**UI:** Horizontal sport tiles with emoji/icon + “Hot in {city}” + session count or ↑ trend.  
**Tap:** Sets sport context + scrolls Explore to sport-biased rails / opens venue results for that sport.  
**Data:** Bookings + open matches + searches in last 7 days (city-scoped).

### 4.3 Trending Events

**Purpose:** Upcoming tournaments/leagues gaining registrations.

**Card:** Date badge, title, sport, venue/city, spots/social proof (“120 registered”).  
**CTA:** View event → Register.  
**See all:** Events results sorted by trending score.

### 4.4 Popular Trainers

**Purpose:** Discover coaches (public trainer profiles).

**Card:** Avatar, name, sports, rating, academy/venue tags, “Available for batches”.  
**CTA:** View profile → programs / contact policy.  
**Privacy:** Only trainers opted into discovery.

### 4.5 Kids Academies

**Purpose:** Parent-oriented program discovery.

**Card:** Program/academy name, age band, schedule snippet, fee from, venue area.  
**CTA:** View → Enroll path.  
**Highlight:** Pin higher for users with kid profiles (Home/Explore personalization).

### 4.6 Top Rated Venues

**Purpose:** Quality-ranked venues (not only nearby).

**Sort:** Rating × rating count with Bayesian floor; city-scoped.  
**Card:** Same venue card + prominent star + review count.  
**Diff vs Nearby:** Distance secondary; quality primary.

### 4.7 Featured Products

**Purpose:** Merchandising into Marketplace.

**Card:** Product image, title, price, sport tag, “Featured” badge.  
**CTA:** Product detail → Store stack / Marketplace.  
**Merch rules:** Editorial CMS + sport context + margin rules (ops).

### 4.8 Sports Services

**Purpose:** Stringing, repair, rental discovery.

**Card:** Service title, provider, turnaround, price from, rating, city.  
**CTA:** View → Request.  
**Shortcut chip:** “Stringing near me”.

### 4.9 Printing

**Purpose:** Custom kits / jersey print discovery.

**Card:** Listing title, sample art, price/shirt, min qty, turnaround.  
**CTA:** View → Upload design / order.  
**Cross-link:** Event kit / academy kit collections.

### 4.10 Recommendations

**Purpose:** Personalized “For you” rail (top of feed after search chrome).

**Candidates:** Venues, events, open matches, academies, products, trainers.  
**Reason chips (required):** “Because you play badminton”, “Near home”, “Friends going”, “Complete your kit”.  
**Empty:** Fall back to city trending mix—never a blank rail title without content.

### 4.11 Search

**Purpose:** Precision discovery across entity types.

**Search experience**

1. **Idle:** Recent searches · Trending queries · Category shortcuts  
2. **Typing:** Suggest entities + query completions  
3. **Results:** Segmented tabs or mixed stream with type filters  

**Result sections / tabs:** All · Venues · Events · Academies · Trainers · Products · Services · Print · Players (P1) · Communities (P1)

**Each hit row:** Type icon, title, subtitle (city/sport), meta, CTA.

**Zero results:** Spelling help · broader city · “Host a match” / “List venue” CTAs.

### 4.12 Filters

**Purpose:** Narrow any results set.

**Filter sheet IA (grouped)**

| Group | Facets |
|-------|--------|
| **What** | Entity types (multi) |
| **Sport** | Multi-select sports |
| **Where** | City (locked to context), area/locality, radius |
| **When** | Tonight, weekend, date range (events/venues availability) |
| **Price** | Min–max (venues from-price, products, fees) |
| **Quality** | Min rating, verified partner |
| **Venue** | Indoor/outdoor, amenities (parking, lighting, …) |
| **Kids** | Age band |
| **Events** | Skill level, registration open |
| **Commerce** | In stock, category |
| **Services** | Category, max turnaround days |

**UX**

- Apply / Reset / “X filters active” on chip  
- Filters sync to URL on web (`?sport=&priceMax=`) for shareability  
- Mobile: full-height sheet; clear hierarchy; sticky Apply  

### 4.13 Map

**Purpose:** Spatial browse of geo entities (venues primarily; events P1).

**Mobile**

- Map full screen with bottom sheet peek of selected pin  
- Cluster pins when zoomed out  
- Toggle list ↔ map  
- Recenter · change radius  

**Web**

- Split view ≥1024px: map | results list  
- Draw search-this-area on pan  
- Pin card hover/click syncs list highlight  

**Pins:** Venue (primary), Event (secondary color), User-selected favorite star overlay.  
**Privacy:** Never plot private player homes; Nearby Players stays list/bands (Community rules).

### 4.14 Favorites

**Purpose:** One-tap save for quick return.

**What can be favorited:** Venue, Event, Academy/Program, Trainer, Product, Service listing, Print listing, Collection.  
**UX:** Heart on cards/detail; Favorites hub under Explore profile menu or Profile → Saved.  
**Explore access:** Chip “Favorites” or rail “Saved near you”.  
**Empty:** Prompt to heart venues while browsing.

### 4.15 Collections

**Purpose:** Curated or user-built sets (“Indiranagar badminton”, “Weekend tournaments”, “U-10 cricket”).

**Types**

| Type | Owner | Visibility |
|------|-------|------------|
| **Editorial** | FitOra CMS / City ops | Public |
| **User** | Player | Private / friends / public |
| **Smart** | System | Public (e.g. “Top rated this month”) |

**UX**

- Collection card on Explore (cover collage + title + count)  
- Collection detail: ordered entities, follow/save collection  
- User: “Add to collection” from entity overflow menu  
- Share collection link (web)

---

## 5. Screen inventory

### 5.1 Mobile (ExploreStack)

```
ExploreHome
SearchMode (modal/screen)
ExploreResults
ExploreMap
FilterSheet
VenueDetail → (handoff Book to PlayStack)
EventDetail
ProgramDetail / AcademyDetail
TrainerPublicProfile
ProductDetail → StoreStack
ServiceDetail / PrintDetail
FavoritesHub
CollectionDetail
CollectionCreateEdit
RecommendationsSeeAll
```

### 5.2 Web

```
/explore
/explore/search?q=
/explore/map
/explore/favorites
/explore/collections
/explore/collections/[slug]
/explore/collections/new
(+ existing entity routes for detail)
```

---

## 6. Key user flows

### 6.1 “Book something tonight”

```
Explore → City set
  → Nearby Venues / Filter When=Tonight
  → Venue detail → Book (Play/Venues flow)
```

### 6.2 “Kid class near me”

```
Explore → Kids Academies rail OR category Academies
  → Filter age band
  → Program detail → Enroll
```

### 6.3 “What’s trending to watch/join”

```
Explore → Trending Events
  → Event detail → Register
  OR Trending Sports → sets sport → Nearby Venues
```

### 6.4 “Find a coach”

```
Explore → Popular Trainers / Search “coach badminton”
  → Trainer profile → linked programs
```

### 6.5 “Buy grip + stringing”

```
Explore → Featured Products → Product
Explore → Sports Services → Request
  (or Search “stringing”)
```

### 6.6 “Save a weekend list”

```
Browse venues/events → Add to Collection “Saturday crew”
  → Favorites / Collections hub → open later → Map of collection (P1)
```

### 6.7 Map browse

```
Explore → Map
  → Pan area → Search this area
  → Tap pin → Peek card → Open detail
```

---

## 7. Card system (design language)

| Card type | Primary meta | Primary CTA |
|-----------|--------------|-------------|
| Venue | Distance, price from, rating | View / Book |
| Event | Date, spots | View |
| Trainer | Sport, rating | View |
| Academy/Program | Age, fee | View |
| Product | Price | View |
| Service/Print | Turnaround, price | View |
| Collection | Item count | Open |
| Recommendation | Reason chip | Context CTA |

**Density:** Mobile horizontal rails (peek 1.2 cards); web rails or 2–4 col grids for See all.

---

## 8. Personalization & ranking (UX-visible)

| Signal | UX effect |
|--------|-----------|
| Sport Passport sports | Bias rails & search boost |
| Kid profiles | Kids Academies rises |
| Recent booking | Recommend products/services |
| Friends’ events | “Friends going” on event cards |
| Favorites | Boost similar venues |
| Time of day | “Tonight” inventory emphasis |

Always show **why** on Recommendations; avoid creepy phrasing.

---

## 9. Empty, loading, error

| State | Treatment |
|-------|-----------|
| Loading | Per-rail skeletons; search chrome immediate |
| Empty rail | Hide rail OR single soft empty (don’t stack 8 empties) |
| Empty city inventory | “Expand search” + partner CTA |
| Map no pins | Adjust zoom / clear filters message |
| Offline | Cached favorites + last results; banner |

---

## 10. Accessibility & performance UX

- Search field labeled; filters announced with count  
- Map alternative: always list mode  
- Pins not color-only (shape/label)  
- Prefer cached Nearby first paint  
- Lazy-load below-fold rails  
- Image CDN sizes per card breakpoint  

---

## 11. Analytics events

- `explore_open`  
- `explore_search` (query, result_count)  
- `explore_rail_impression` / `explore_rail_click`  
- `explore_filter_apply`  
- `explore_map_toggle`  
- `explore_favorite` / `explore_collection_add`  
- `explore_to_book_start` (conversion)  

---

## 12. Content & CMS hooks

Editorial **Collections** and **Featured Products** managed via Command CMS.  
City launch playbooks: seed collections (“Best badminton in {city}”).

---

## 13. Responsive behavior (web)

| Breakpoint | Explore layout |
|------------|----------------|
| &lt;768 | Single column rails; filters sheet; map full screen |
| 768–1023 | 2-col see-all grids |
| ≥1024 | Optional sticky filter rail on Results; map split |
| ≥1280 | Comfortable split map + 3-col cards |

---

## 14. Delivery phases

### Phase 1 — Discover core

Search · City/Sport · Nearby Venues · Top Rated · Filters · Favorites · Map (venues)

### Phase 2 — Ecosystem rails

Trending Sports/Events · Kids Academies · Trainers · Products · Services · Printing · Recommendations v1

### Phase 3 — Curation

Collections (editorial + user) · Smarter reasons · Map events · Collection map  

---

## 15. Open decisions

| Topic | Options | Recommendation |
|-------|---------|----------------|
| Players in Explore search | Yes / Community only | **P1 tab**; Nearby Players primarily Community/Play |
| Open Matches in Explore | Rail vs Play only | **Shortcut chip → Play**; optional small rail P1 |
| Default sport chip | All vs last used | **Last used**, fallback All |
| Favorites location | Explore vs Profile | **Both**: hub in Explore + Profile Saved |

---

## 16. Document control

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-07-13 | Explore UX — rails, search, filters, map, favorites, collections |

**Out of scope:** Code, API schemas, visual Figma.  
**Next:** Figma Explore home + search results + filter sheet + map split → engineering epic.
