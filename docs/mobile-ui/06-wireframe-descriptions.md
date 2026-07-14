# FitOra Mobile — Wireframe Descriptions

> Version 1.0 · July 2026
> This document describes every screen layout in detail. Use alongside Figma prototypes.

---

## Legend

```
[  ] = Container / Box
|  | = Image / Media block
( ) = Button / CTA
{  } = Input field
<<>> = Icon
≡    = Menu / hamburger
•    = Bullet / List item
~    = Animated element
```

---

## 1. Splash Screen

```
┌─────────────────────────────┐
│                             │
│                             │
│         |  FitOra Logo  |   │  ← centered, scale-in animation
│                             │
│      ~ tagline fades in ~   │  ← "Find Your Game"
│                             │
│                             │
└─────────────────────────────┘
```

**Behavior**:
- Logo animates in with spring scale (0.6 → 1.0)
- Tagline fades up 400ms after logo settles
- Auto-redirects after 2s (or when auth check resolves)
- Background: `secondary-900` (`#111827`)
- Logo: Orange on dark

---

## 2. Welcome Carousel

```
┌─────────────────────────────┐
│  [Skip]              •••○○  │  ← dots indicator
│                             │
│  |  Full-bleed sports       │
│  |  photography             │
│  |  (16:9 hero image)       │
│                             │
│  ┌────────────────────────┐ │
│  │  Discover Sports       │ │  ← display-lg
│  │  Near You              │ │
│  │                        │ │
│  │  Book courts, find     │ │  ← body-md, muted
│  │  coaches and join      │ │
│  │  games in minutes.     │ │
│  └────────────────────────┘ │
│                             │
│  ( Continue →            )  │  ← primary button
└─────────────────────────────┘
```

**Notes**:
- 3 slides, swipeable
- Each slide has unique photography and copy
- Gradient overlay on image: top transparent → bottom dark
- Text overlays on gradient for contrast

---

## 3. Auth Screen

```
┌─────────────────────────────┐
│  |  Full-screen sports      │
│  |  background image        │
│  |  with dark gradient      │
│  |  overlay                 │
│                             │
│  [FitOra]  tagline          │  ← brand mark, top-left
│                             │
│  ┌────── bottom sheet ────┐ │  ← slides up on load
│  │  ─────  handle  ─────  │ │
│  │                        │ │
│  │  Welcome Back 👋        │ │  ← display-md
│  │  Sign in to continue   │ │  ← body-md, muted
│  │                        │ │
│  │  {  +91  |  Phone No  }│ │  ← phone input
│  │                        │ │
│  │  (   Continue →      ) │ │  ← primary button
│  │                        │ │
│  │  ─────── or ──────── │ │
│  │                        │ │
│  │  ( G  Continue w/ Google)│  ← social button
│  │  (   Continue w/ Apple )│ │  ← Apple Sign In (iOS)
│  │                        │ │
│  │  ( Continue as Guest ) │ │  ← ghost button
│  │                        │ │
│  │  By continuing you agree│ │  ← caption, tappable TOS link
│  │  to Terms & Privacy    │ │
│  └────────────────────────┘ │
└─────────────────────────────┘
```

---

## 4. OTP Verification Screen

```
┌─────────────────────────────┐
│  ← Back                     │
│                             │
│  Verify your number         │  ← display-md
│  OTP sent to +91-XXXXXXXX90 │  ← body-md, muted, editable tap
│                             │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐  │  ← 6 animated OTP boxes
│  │ _ │ │ _ │ │ _ │ │ _ │ │ _ │ │ _ │  │
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘  │
│                             │
│  Didn't receive OTP?        │  ← body-sm, muted
│  Resend in 00:45            │  ← countdown timer (orange when active)
│                             │
│  (   Verify                )│  ← primary button, disabled until 6 digits
│                             │
└─────────────────────────────┘
```

**OTP Box States**:
- Empty: light border, normal size
- Active: primary orange border, slight scale up
- Filled: dark border, number visible
- Success: all boxes turn accent-green with checkmark icon

---

## 5. Home Screen

```
┌─────────────────────────────┐
│ Status bar                  │
├─────────────────────────────┤
│  Good Morning, Alex 🏃      │  ← display-md greeting
│  << Bengaluru, KA  ∨ >>     │  ← location chip (tappable)
│                         <<🔔>>│  ← notification bell (badge)
│                             │
│  ╭─────────────────────╮    │
│  │ <<🔍>> Search venues │    │  ← rounded search bar (navigates to Explore)
│  ╰─────────────────────╯    │
│                             │
│  [Badminton][Football][Cricket][Tennis][→]  │  ← sport chips, horizontal scroll
│                             │
│ ─── NEARBY VENUES ─── See All→              │
│                             │
│  ┌──────────┐ ┌──────────┐  │  ← horizontal venue cards
│  │  |img|   │ │  |img|   │  │
│  │ Venue A  │ │ Venue B  │  │
│  │ ⭐4.8 •2km│ │ ⭐4.6 •3km│  │
│  │ ₹300/hr  │ │ ₹400/hr  │  │
│  └──────────┘ └──────────┘  │
│                             │
│ ─── POPULAR SPORTS ───      │
│  ┌──┐ ┌──┐ ┌──┐             │
│  |⚽| |🏸| |🏏|             │  ← 2×3 sport grid
│  └──┘ └──┘ └──┘             │
│  ┌──┐ ┌──┐ ┌──┐             │
│  |🎾| |🏊| |🏀|             │
│  └──┘ └──┘ └──┘             │
│                             │
│ ─── TOP COACHES ─── See All→│
│  [CoachCard] [CoachCard]    │  ← horizontal scroll
│                             │
│ ─── GAMES NEAR YOU ── See →  │
│  [GameCard] [GameCard]      │  ← horizontal scroll
│                             │
│ ─── MEMBERSHIP PLANS ──     │
│  ┌──────────────────────┐   │
│  │  🏆 Gold Member       │   │  ← featured membership card
│  │  Unlimited bookings  │   │
│  │  ( Join Now )        │   │
│  └──────────────────────┘   │
│                             │
│  [more sections continue...]│
│                             │
│  ╭────╮                     │  ← FAB, bottom right
│  │ +  │  Quick Book         │
│  ╰────╯                     │
├─────────────────────────────┤
│ [Home] [Explore] [Play] [Store] [Profile] │  ← bottom nav
└─────────────────────────────┘
```

---

## 6. Explore Screen (Map Mode)

```
┌─────────────────────────────┐
│  ╭─────────────────────╮    │
│  │← <<🔍>> Search venues│    │  ← search header
│  ╰─────────────────────╯    │
│  [Badminton][Open Now][Indoor][⊞ Filters(2)]  │  ← sticky filter chips
│                             │
│  [Map  |  List]             │  ← segmented control
│                             │
│  ┌─────────────────────────┐│
│  │                         ││
│  │    [Google Maps]        ││  ← full-height map
│  │                         ││
│  │  📍 [₹300]  📍 [₹450]  ││  ← venue price pins
│  │       📍 [₹250]        ││
│  │  📍 YOU                 ││  ← pulsing user dot
│  │                         ││
│  └─────────────────────────┘│
│                             │
│  ┌──── draggable list ─────┐│  ← bottom sheet over map
│  │  ─ handle ─             ││
│  │  12 venues nearby       ││
│  │                         ││
│  │  [VenueCardCompact]     ││
│  │  [VenueCardCompact]     ││
│  │  [VenueCardCompact]     ││
│  └─────────────────────────┘│
│                             │
├─────────────────────────────┤
│ [Home] [Explore] [Play] [Store] [Profile] │
└─────────────────────────────┘
```

---

## 7. Venue Detail Screen

```
┌─────────────────────────────┐
│  ← Back        <<♡>> <<⬆>> │  ← back, save, share
│                             │
│  ┌─────────────────────────┐│
│  │  |  Hero Image          ││  ← 16:9, collapsing on scroll
│  │  |  (full-bleed)        ││
│  │  ┌─────┐  ┌──────────┐  ││  ← glass overlays on image
│  │  │Open │  │⭐4.8(234)│  ││
│  │  └─────┘  └──────────┘  ││
│  │  1/8 ──●──○──○         ││  ← gallery dot indicator
│  └─────────────────────────┘│
│                             │
│  Grand Slam Sports Complex  │  ← display-md
│  📍 Koramangala, Bengaluru  │  ← body-md, location icon
│                             │
│  [Badminton][Football][Cricket]  │  ← sport chips
│                             │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐│
│  │2km │ │6am-│ │12  │ │₹300│ ← quick stats row
│  │dist│ │10pm│ │crt │ │/hr │
│  └────┘ └────┘ └────┘ └────┘│
│                             │
│  Amenities                  │  ← section title
│  [Parking][Cafeteria][WiFi][Locker]  │
│                             │
│  Sports & Pricing           │
│  Badminton   ₹300–500/hr   >│  ← expandable rows
│  Football    ₹800–1200/hr  >│
│                             │
│  Top Coaches                │
│  [CoachCard] [CoachCard]    │  ← horizontal
│                             │
│  Photos (8)                 │
│  ┌──┐┌──┐┌──┐  +5          │  ← 3 photos + overflow
│  └──┘└──┘└──┘               │
│                             │
│  Reviews ⭐4.8 (234)         │
│  [RatingSummary]            │
│  [ReviewItem]               │
│  [ReviewItem]               │
│  See All 234 reviews →      │
│                             │
│  (         Book Now         )│  ← sticky bottom CTA
│  From ₹300 · 2 courts free  │
└─────────────────────────────┘
```

---

## 8. Time Slot Selection

```
┌─────────────────────────────┐
│  ← Court A · Badminton      │
│                             │
│  ◀  July 2026  ▶            │  ← month navigation
│  Su Mo Tu We Th Fr Sa       │
│  [dates as calendar grid]   │
│  14 selected with orange    │
│                             │
│  Duration                   │
│  [60 min] [90 min] [120 min]│  ← segmented
│                             │
│  Morning                    │
│  ┌──────┐ ┌──────┐ ┌──────┐│
│  │ 6:00 │ │ 6:30 │ │ 7:00 ││  ← time slot grid
│  │  AM  │ │  AM  │ │  AM  ││
│  │ Free │ │Booked│ │ Free ││
│  └──────┘ └──────┘ └──────┘│
│                             │
│  Afternoon                  │
│  ┌──────┐ ┌──────┐ ...      │
│  │ 12:00│ │ 12:30│          │
│  │ PM   │ │ PM   │          │
│  │ Free │ │ Free │          │
│  └──────┘ └──────┘          │
│                             │
│  ┌──────────────────────┐   │
│  │ Selected: 7:00 AM    │   │  ← sticky summary
│  │ 60 min · ₹350        │   │
│  │ ( Continue →       ) │   │
│  └──────────────────────┘   │
└─────────────────────────────┘
```

**Slot Colors**:
- Available: White card, green left border
- Booked: Gray background, strikethrough text
- Selected: Orange fill, white text
- In progress (others selecting): Yellow with timer

---

## 9. Booking Confirmation Screen

```
┌─────────────────────────────┐
│                             │
│                             │
│        ~ Lottie animation ~ │  ← confetti + checkmark
│        ~ booking success ~  │
│                             │
│     Booking Confirmed! 🎉   │  ← display-md, orange
│   Your court is reserved.   │  ← body-md, muted
│                             │
│  ┌──────────────────────┐   │
│  │  Grand Slam Complex  │   │  ← booking summary card
│  │  Court A · Badminton │   │
│  │  Tue 15 Jul · 7:00AM │   │
│  │  60 min · ₹350 paid  │   │
│  │                      │   │
│  │  ┌──────────────┐    │   │
│  │  │  [QR CODE]   │    │   │  ← scannable QR
│  │  │              │    │   │
│  │  └──────────────┘    │   │
│  │  Show at venue       │   │
│  └──────────────────────┘   │
│                             │
│  ( 📤 Share Booking       ) │  ← share sheet
│  (    View All Bookings   ) │  ← ghost button
│  (       Back to Home     ) │  ← text button
│                             │
└─────────────────────────────┘
```

---

## 10. Play Hub Screen

```
┌─────────────────────────────┐
│  Play                       │  ← display-md
│  Find or create games       │  ← body-md, muted
│              ( + Create )   │  ← primary button, top right
│                             │
│  [Discover] [My Games] [Friends]  │  ← tab bar
│  ────────────                    │
│                             │
│  🔥 Trending Games          │  ← section
│  ┌─────────────────────┐    │
│  │  |  football img    │    │  ← featured game card (large)
│  │  Football · 3v3     │    │
│  │  Koramangala · Sat  │    │
│  │  ●●●○○○ 3 slots left│    │
│  │  ( Join · Free    ) │    │
│  └─────────────────────┘    │
│                             │
│  Recommended for You        │
│  [GameCard] [GameCard]      │  ← horizontal scroll
│                             │
│  Near You · All Sports      │
│  [GameCard]                 │
│  [GameCard]                 │
│  [GameCard]                 │
│                             │
└─────────────────────────────┘
```

---

## 11. Store Screen

```
┌─────────────────────────────┐
│  Store                 <<🛒2>>│  ← cart icon with badge
│                             │
│  ┌──────── banner ─────────┐│
│  │  |  Summer Sale 30% Off ││  ← full-width promotional banner
│  │  Shop Now →             ││
│  └─────────────────────────┘│
│                             │
│  Categories                 │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐│
│  │ ⚽ │ │ 👕 │ │ 🏆 │ │ 🎽 ││  ← category grid
│  │Gear│ │Kits│ │Trop│ │Acc ││
│  └────┘ └────┘ └────┘ └────┘│
│  ┌────┐ ┌────┐              │
│  │ 🖨️ │ │ ⚙️ │              │
│  │Prnt│ │Srvc│              │
│  └────┘ └────┘              │
│                             │
│  Best Sellers               │
│  ┌────────┐ ┌────────┐      │  ← 2-col product grid
│  │ |img|  │ │ |img|  │      │
│  │Yonex   │ │Nike Kit│      │
│  │Racket  │ │Set     │      │
│  │⭐4.7   │ │⭐4.5   │      │
│  │₹2,499  │ │₹1,799  │      │
│  │(+Cart) │ │(+Cart) │      │
│  └────────┘ └────────┘      │
│                             │
└─────────────────────────────┘
```

---

## 12. Profile Screen

```
┌─────────────────────────────┐
│                   <<⚙️>> <<⋮>>│  ← settings, more options
│                             │
│  ┌──────────────────────┐   │
│  │   ╭──────╮           │   │
│  │   │avatar│ Alex Kumar│   │  ← profile hero
│  │   │      │ @alexk    │   │
│  │   ╰──────╯ [Edit]    │   │
│  │                      │   │
│  │  🥇 Gold Member       │   │  ← membership badge
│  │                      │   │
│  │ ┌────┐ ┌────┐ ┌────┐ │   │  ← stats row
│  │ │ 48 │ │ 12 │ │203 │ │   │
│  │ │Games│ │Win │ │Pts │ │   │
│  │ └────┘ └────┘ └────┘ │   │
│  └──────────────────────┘   │
│                             │
│  ┌──── menu rows ─────────┐ │
│  │ <<🏆>> Achievements   >│ │
│  │ <<📅>> Bookings    (3)>│ │
│  │ <<💳>> Membership     >│ │
│  │ <<👛>> Wallet  ₹1,200 >│ │
│  │ <<🎁>> Rewards   240pt>│ │
│  └────────────────────────┘ │
│                             │
│  ┌──── settings rows ─────┐ │
│  │ <<🔔>> Notifications  >│ │
│  │ <<🌙>> Appearance     >│ │
│  │ <<🔒>> Privacy        >│ │
│  │ <<❓>> Support        >│ │
│  │ <<↩>> Log Out          │ │
│  └────────────────────────┘ │
│                             │
└─────────────────────────────┘
```

---

## 13. Achievements Screen

```
┌─────────────────────────────┐
│ ← Achievements              │
│                             │
│  ┌──────────────────────┐   │
│  │  Level 8 · Sports Pro│   │  ← level card with progress ring
│  │  ~ progress ring ~   │   │
│  │  203 / 300 XP        │   │
│  │  97 XP to Level 9    │   │
│  └──────────────────────┘   │
│                             │
│  Earned Badges (12)         │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐│
│  │ ⚽ │ │ 🏸 │ │ 🏆 │ │ 🌟 ││  ← earned badges (full color)
│  │10  │ │5   │ │1st │ │50  ││
│  │games│ │wins│ │time│ │hrs ││
│  └────┘ └────┘ └────┘ └────┘│
│                             │
│  Locked Badges (8)          │
│  ┌────┐ ┌────┐              │  ← locked badges (grayscale)
│  │ 🔒 │ │ 🔒 │              │
│  └────┘ └────┘              │
│                             │
│  Recent Activity            │
│  [ActivityFeedItem]         │
│  [ActivityFeedItem]         │
│                             │
└─────────────────────────────┘
```

---

## 14. Filter Sheet

```
┌─────────────────────────────┐
│  ─────── handle ─────────   │
│                             │
│  Filters         [Reset All]│
│                             │
│  Sport                      │
│  [Badminton][Football][Cricket][+more]  │
│                             │
│  Distance                   │
│  ─────●─────────────── 10km │  ← slider
│  Within 10 km               │
│                             │
│  Price per hour             │
│  ●───────────────●           │  ← range slider
│  ₹200 ─────────── ₹1000     │
│                             │
│  Type                       │
│  [◉ All] [○ Indoor] [○ Outdoor]  │
│                             │
│  Rating                     │
│  [Any][⭐3+][⭐4+][⭐4.5+]  │
│                             │
│  [ ] Open Now               │  ← toggle row
│  [ ] Has Parking            │
│  [ ] Has Changing Room      │
│                             │
│  ( Apply Filters (12)     ) │  ← count of results
└─────────────────────────────┘
```

---

## 15. Wallet Screen

```
┌─────────────────────────────┐
│ ← Wallet                    │
│                             │
│  ┌──────────────────────┐   │
│  │                      │   │  ← balance card (glass on gradient)
│  │  FitOra Wallet       │   │
│  │                      │   │
│  │    ₹1,200.00         │   │  ← display-xl, balance
│  │    Available         │   │
│  │                      │   │
│  │  ( + Add Money     ) │   │
│  └──────────────────────┘   │
│                             │
│  Quick Actions              │
│  ┌──────┐ ┌──────┐ ┌──────┐ │
│  │  +   │ │  ↕   │ │  📄  │ │
│  │ Add  │ │Trans │ │State │ │
│  └──────┘ └──────┘ └──────┘ │
│                             │
│  Recent Transactions        │
│  [TransactionItem: Booking -₹350]   │
│  [TransactionItem: Added +₹500]     │
│  [TransactionItem: Booking -₹200]   │
│                             │
│  See All Transactions →     │
│                             │
└─────────────────────────────┘
```
