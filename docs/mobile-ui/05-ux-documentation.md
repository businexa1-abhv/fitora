# FitOra Mobile — UX Documentation

> Version 1.0 · July 2026
> Audience: Product Managers, UX Designers, Engineers

---

## UX Vision

> "FitOra should feel like the sports friend who knows every court in the city, always has a game to join, and makes booking as easy as ordering food."

The app bridges the gap between **discovery** and **action**. Every UX decision prioritises:

1. **Speed to first booking** — from open to booked in under 3 minutes
2. **Community belonging** — every player feels part of a sports network
3. **Trust** — clear pricing, transparent availability, real reviews
4. **Delight** — small moments of joy that make the app memorable

---

## User Personas

### Persona 1 — The Weekend Warrior
- **Age**: 26–35
- **Motivation**: Book courts quickly for weekend games with friends
- **Pain Point**: Calling venues, uncertain availability, no group coordination
- **Key Flows**: Explore → Venue → Book → Share with friends
- **Design Need**: Fast booking, group sharing, last-minute availability

### Persona 2 — The Competitive Player
- **Age**: 22–30
- **Motivation**: Find competitive games, track progress, connect with other players
- **Pain Point**: Fragmented community, no skill matching, no stats tracking
- **Key Flows**: Play Hub → Join Game → Community → Achievements
- **Design Need**: Skill badges, game stats, player profiles, leaderboards

### Persona 3 — The Sports Parent
- **Age**: 32–45
- **Motivation**: Find quality coaching and academies for children
- **Pain Point**: Discovering trusted coaches, scheduling conflicts
- **Key Flows**: Home → Kids Academy → Coach Detail → Book Session
- **Design Need**: Trust signals (verified coach badge), schedule views, receipts

### Persona 4 — The Fitness Enthusiast
- **Age**: 28–40
- **Motivation**: Stay active, try different sports, track activity
- **Pain Point**: Discovering new sports venues and activities
- **Key Flows**: Home → Sport Categories → Venues → Membership Plans
- **Design Need**: Activity diversity, membership value, progress tracking

### Persona 5 — The Store Shopper
- **Age**: 20–35
- **Motivation**: Buy equipment, custom jerseys, sports accessories
- **Pain Point**: Generic e-commerce, no sports context
- **Key Flows**: Store → Category → Product → Cart → Checkout
- **Design Need**: Sport-specific curation, size guides, quick reorder

---

## Core UX Principles

### 1. Progressive Disclosure
Show essential information first; reveal details on demand.
- Venue cards show: name, sport, rating, distance, price range
- Full details on tap: gallery, amenities, full pricing, reviews

### 2. Optimistic UI
React immediately to user actions; confirm/revert in background.
- "Join Game" → instant slot count update → API confirmation
- "Add to Cart" → instant badge increment → API sync

### 3. Contextual CTAs
The right action at the right moment.
- Time slot grid → "Book This Slot" (not generic "Book Now")
- Empty bookings → "Find a Court Near You"
- After booking → "Share with Friends"

### 4. Graceful Degradation
Every state is designed: loading, error, empty, offline.

### 5. Habitual Entry Points
Make returning to the app rewarding:
- "Continue where you left off" (incomplete bookings)
- "Your game is tomorrow" (reminder cards)
- "3 friends played here" (social proof)

---

## Key UX Flows

### Flow 1: First-Time User Onboarding

**Goal**: Reach personalized Home feed in under 60 seconds.

| Step | Screen | UX Detail |
|------|--------|-----------|
| 1 | Welcome Carousel | 3 slides, skip always visible, auto-advance after 4s |
| 2 | Auth Screen | Phone as primary (most familiar), social as shortcuts |
| 3 | OTP | 6-box auto-advance, 60s timer, haptic on success |
| 4 | Name Setup | Optional avatar, autofill from phone contacts |
| 5 | Sport Preferences | Chip multi-select, visual icons, minimum 1 required |
| 6 | Location | Explain why location matters, accept/deny/manual entry |
| 7 | Home Feed | "Welcome, [Name]! Let's find you a game." personalized greeting |

**Drop-off mitigation**:
- Steps 4–6 can be skipped ("Set up later")
- Progress indicator shows 3 steps remaining
- "Continue as Guest" always available

---

### Flow 2: Quick Court Booking

**Goal**: Book a badminton court for tomorrow in under 2 minutes.

| Step | UX Detail |
|------|-----------|
| Open app | Home feed with nearby venues prominent |
| Tap venue card | SharedElement transition, hero image expands |
| Review venue | Sticky "Book Now" bar always visible |
| Tap "Book Now" | Bottom sheet for sport selection |
| Select sport | Large sport chips, icons, price preview |
| Select court | Visual court map or simple list |
| Select date | Calendar highlighting available days |
| Select time | Color-coded grid (available/booked/selected) |
| Review summary | Full breakdown: venue, sport, court, time, price |
| Pay | One-tap wallet or saved card |
| Confirmation | Lottie celebration, QR code, share option |

**Total interactions**: 10 taps + 1 payment
**Target time**: Under 90 seconds for repeat users

---

### Flow 3: Discover and Join a Game

**Goal**: Find a football game this weekend with open slots.

| Step | UX Detail |
|------|-----------|
| Play tab | Game cards with sport icon, date, slots remaining |
| Filter | Sport chip filter, date filter, distance filter |
| Game detail | Players already joined (avatar stack), venue map, rules |
| Join decision | Skill level, entry fee (if any), cancellation policy |
| Join game | Payment (if required) or free join |
| Confirmation | Added to "My Games", friends notified |

---

### Flow 4: Explore with Map

**Goal**: Find an open indoor badminton court right now.

| Step | UX Detail |
|------|-----------|
| Explore tab | Map with venue pins, list preview at bottom |
| Search | Contextual placeholder: "Search courts, sports, venues..." |
| Filter | Tap filter icon → Filter sheet opens from bottom |
| Set filters | Indoor toggle, Open Now, Badminton sport chip |
| Results | Map pins update, list scrolls to first result |
| Venue pin tap | Mini-card appears on map (glass style) |
| Tap mini-card | → Venue Detail |

**Map UX**:
- Pins cluster when zoom is low, expand on zoom in
- "Open Now" pins have a green dot indicator
- Price shown on selected pin

---

### Flow 5: Store Purchase

**Goal**: Buy a badminton racket and custom jersey.

| Step | UX Detail |
|------|-----------|
| Store tab | Featured banner, categories prominent |
| Equipment category | Grid layout, filter chips (sport, price, brand) |
| Product detail | Gallery swipe, size guide link, reviews |
| Add to cart | Animated cart icon (+1), toast confirmation |
| Continue shopping | Return to store, find jersey |
| Printing services | Upload design flow, product selector |
| Cart | Items list, quantity adjust, order summary |
| Checkout | Address, delivery time, payment |
| Confirmation | Order number, tracking CTA |

---

## Micro-Interactions

### Time Slot Selection
- Tap available slot → Instant fill with `primary-500` color
- Soft haptic feedback (selection impact)
- Duration pill appears above: "60 min · ₹500"

### Game Join
- Slot counter decrements with spring animation
- Player avatar "slides in" to avatar stack
- Joining button morphs to "Joined ✓"

### OTP Boxes
- Each box grows slightly on focus
- Auto-advances cursor to next box on digit entry
- Shake animation on incorrect OTP
- All boxes turn green + checkmark on success

### Like / React
- Heart icon does spring pop scale animation
- Count increments with slide-up number animation
- Color fills from center outward

### Bottom Tab Active State
- Icon fills (regular → fill variant)
- Spring scale up to 1.1 then settle
- Label slides up and fades in
- Animated dot indicator slides to active tab

### Card Press
- Subtle scale: `0.97` over 120ms spring
- Shadow reduces slightly
- Release: spring back to 1.0

---

## Search UX

### Search Entry
1. Tap SearchBar → full-screen search overlay slides up
2. Keyboard opens immediately
3. Recent searches shown instantly
4. Suggested categories as chips below

### Search Results
- Real-time suggestions as user types (debounced 300ms)
- Results grouped: Venues | Coaches | Games | Sports
- "Did you mean...?" for common typos
- Recent searched preserved (max 10)

### No Results State
- Sympathetic illustration
- "No venues for '[query]'"
- Suggestions: "Try 'Football' or 'Cricket'"
- "Clear search" CTA

---

## Notifications UX

### Notification Types

| Type | Priority | Action |
|------|----------|--------|
| Booking reminder (1h before) | High | View QR |
| Game invite | High | Accept / Decline |
| Booking confirmed | Medium | View booking |
| New coach in your sport | Low | View profile |
| Offer / Promo | Low | View offer |
| New game near you | Low | View game |

### Notification Center
- Grouped by date (Today, Yesterday, This Week)
- Unread notifications have left orange border indicator
- Swipe left → Dismiss individual notification
- "Clear All" button in header
- Empty state: "You're all caught up 🎯"

---

## Error States & Recovery

### Network Error
- Toast: "No internet connection. Check your network."
- Retry button on full-page errors
- Cached data shown with "Last updated X mins ago" banner

### Booking Conflict
- "This slot was just taken. Here are similar slots:" → Suggest alternatives inline
- Never leave user at a dead end

### Payment Failure
- Clear error message (don't show technical codes)
- "Try a different payment method" CTA
- Keep booking details preserved for retry

### Empty Search
- Suggest nearby alternatives
- "Expand search radius?" CTA
- Show popular venues as fallback

---

## Trust Signals

| Signal | Location | Purpose |
|--------|----------|---------|
| Verified badge | Coach cards, venue headers | Authenticity |
| Review count | All cards | Social proof |
| "Booked X times today" | Venue detail | Popularity |
| Response rate | Coach profile | Reliability |
| Cancellation policy | Booking summary | Risk clarity |
| Secure payment badge | Payment screen | Security trust |
| Member count | Membership plans | Community size |

---

## Onboarding Tooltips & Coachmarks

FitOra uses a **non-intrusive coachmark system** that only triggers once per feature:

| Feature | Trigger | Tooltip |
|---------|---------|---------|
| Filter bar (Explore) | First visit to Explore | "Filter by sport, distance, and price" |
| FAB (Home) | 3rd app open | "Tap to quick-book a court" |
| Play Hub | First time on Play tab | "Find games to join or create your own" |
| Wallet | After first booking | "Use wallet for instant checkout next time" |
| Game creation | After joining first game | "Ready to host your own game?" |

Coachmarks are:
- Dismissible with single tap
- Never shown more than once per feature
- Respect `reduceMotion` preference

---

## Dark Mode UX Guidelines

- Dark mode is a first-class experience, not an afterthought
- Sports photography remains full-color (no desaturation)
- Orange primary remains `#F97316` — no adjustment needed
- Shadows are less visible in dark mode; use border + background contrast instead
- Glass effects work especially well in dark mode (neon-tinged)
- Status bar style switches automatically

---

## Accessibility UX Guidelines

### Screen Reader (VoiceOver / TalkBack)
- All images have descriptive `accessibilityLabel`
- Cards announce: "[Venue Name], [Sport], [Rating] stars, [Distance], [Price]"
- Loading states announce: "Loading venues..."
- Success states announce: "Booking confirmed for [time] at [venue]"

### Motor Accessibility
- All interactive targets ≥ 44×44pt
- Swipe gestures have accessible alternatives (buttons)
- Bottom sheet can be closed via "Close" button, not just swipe

### Visual Accessibility
- All text passes WCAG 2.1 AA minimum (4.5:1)
- Do not convey information through color alone (add icons)
- Text scale up to 200% without breaking layouts (use flex, not fixed heights)

### Cognitive Accessibility
- Plain language throughout
- Confirmation before destructive actions (cancel, delete)
- Clear progress indicators in multi-step flows
- Consistent navigation patterns across all screens
