# FitOra Mobile — Screen Hierarchy

> Version 1.0 · July 2026

---

## Overview

FitOra is structured around 5 primary tabs with layered sub-navigation stacks. Each tab maintains its own navigation history. Deep links can enter any level of the hierarchy.

```
FitOra App
├── Onboarding Stack (unauthenticated)
│   ├── Splash Screen
│   ├── Welcome / Intro Carousel
│   ├── Auth Screen (Phone / Google / Apple)
│   ├── OTP Verification
│   ├── Profile Setup
│   │   ├── Name & Avatar
│   │   ├── Sport Preferences
│   │   └── Location Permission
│   └── → Main App (Tab Navigator)
│
└── Main App (Bottom Tab Navigator) (authenticated)
    ├── Home Tab
    ├── Explore Tab
    ├── Play Tab
    ├── Store Tab
    └── Profile Tab
```

---

## Onboarding Stack

### 1.1 Splash Screen
- **Purpose**: Brand moment, auth state check
- **Duration**: 2s max, skipped if cached auth token valid
- **Elements**: FitOra logo animation, tagline fade-in

### 1.2 Welcome Carousel
- **Purpose**: Feature discovery for new users
- **Slides**: 3 slides
  - Slide 1: "Discover Sports Near You" — venue imagery
  - Slide 2: "Play, Compete, Connect" — community imagery
  - Slide 3: "Book Courts Instantly" — booking flow preview
- **Skip CTA**: Top-right skip button (always visible)

### 1.3 Auth Screen
- **Purpose**: Sign in / Sign up
- **Layout**: Full-screen sports background, gradient overlay, bottom sheet modal
- **Methods**:
  - Phone number input (primary)
  - Google Sign-In
  - Apple Sign-In (iOS only)
  - Continue as Guest (limited features)

### 1.4 OTP Verification
- **Purpose**: Phone number verification
- **Elements**: 6-box animated OTP input, 60s resend timer, auto-submit on complete

### 1.5 Profile Setup — Name & Avatar
- **Purpose**: Personalization
- **Elements**: Avatar picker (camera / gallery / initials), full name, display name

### 1.6 Profile Setup — Sport Preferences
- **Purpose**: Personalized home feed
- **Elements**: Sport selection chips (multi-select), minimum 1 required

### 1.7 Profile Setup — Location
- **Purpose**: Nearby content
- **Elements**: Location permission request with context, manual city fallback

---

## Home Tab Stack

```
Home Tab
├── Home Feed Screen (root)
│   ├── Notification Center Sheet
│   └── Location Picker Sheet
├── Venue Detail Screen
│   ├── Gallery Screen (full-screen)
│   ├── All Reviews Screen
│   ├── All Coaches Screen
│   └── Booking Flow Stack →
│       ├── Sport Selection Screen
│       ├── Court Selection Screen
│       ├── Date & Time Screen
│       ├── Booking Summary Screen
│       ├── Payment Screen
│       └── Booking Confirmation Screen
├── Coach Detail Screen
│   └── Book Coach Screen
├── Sport Category Screen
│   └── → Venue Detail Screen
├── All Nearby Venues Screen
├── All Popular Sports Screen
├── Kids Academy Screen
│   └── → Venue / Coach Detail
├── All Upcoming Games Screen (links to Play tab)
├── Membership Plans Screen
│   └── Membership Checkout Screen
├── Event Detail Screen
│   └── Event Booking Screen
└── Community Post Detail Screen
```

### Home Feed Screen Sections (scroll order)

1. **Header** — Greeting, location, notification bell
2. **Search Bar** — Rounded, leads to Explore tab
3. **Quick Filters** — Sport horizontal chips
4. **Continue Booking** — Resumable incomplete bookings (conditional)
5. **Nearby Venues** — Horizontal carousel of venue cards
6. **Popular Sports** — 2×3 grid of sport category tiles
7. **Featured Coaches** — Horizontal carousel of coach cards
8. **Kids Academy** — Single promotional card
9. **Upcoming Games** — Horizontal carousel of game cards
10. **Membership Plans** — Highlighted plan card
11. **Featured Products** — Horizontal product carousel
12. **Sports Services** — Service category grid
13. **Upcoming Events** — Horizontal event card carousel
14. **Recommended for You** — Algorithm-driven venue/coach cards
15. **Community Feed** — Latest 3 community posts, "See All" CTA

---

## Explore Tab Stack

```
Explore Tab
├── Explore Screen (root) — Map + List dual view
│   ├── Search Results Screen
│   │   └── → Venue Detail Screen
│   ├── Filter Bottom Sheet
│   │   ├── Sport Filter
│   │   ├── Distance Filter
│   │   ├── Price Range Filter
│   │   ├── Indoor / Outdoor Toggle
│   │   ├── Rating Filter
│   │   └── Open Now Toggle
│   └── Map Marker Detail Mini-Card (inline)
└── → Venue Detail Screen (shared)
```

### Explore Screen States

| State | Description |
|-------|-------------|
| Default | Map centered on user location, nearby venue pins |
| List View | Scrollable card list, sticky map mini-preview at top |
| Searching | Search results overlay, filter chips sticky |
| No Results | Empty state with "Adjust Filters" CTA |
| Location Denied | Prompt to enter city manually |

---

## Play Tab Stack

```
Play Tab
├── Play Hub Screen (root)
│   ├── Hosted Games List
│   ├── Join Games List
│   └── Friends Playing Section
├── Game Detail Screen
│   ├── Player Profiles (scrollable list)
│   └── Join Game Bottom Sheet
├── Create Game Screen
│   ├── Sport Selection
│   ├── Venue Selection (from Explore)
│   ├── Date & Time
│   ├── Player Slots & Settings
│   └── Invite Friends Screen
├── Game Invitations Screen
│   └── Invitation Detail Bottom Sheet
└── Recommended Games Screen
    └── → Game Detail Screen
```

### Play Hub Tabs

The Play screen has 3 horizontal tabs:
1. **Discover** — Recommended games, hosted games
2. **My Games** — Games I've joined or created
3. **Friends** — Activity from following network

---

## Store Tab Stack

```
Store Tab
├── Store Home Screen (root)
│   ├── Featured Banner Carousel
│   ├── Category Grid
│   └── Offers Section
├── Category Screen (Equipment / T-Shirts / Trophies / Accessories)
│   └── → Product Detail Screen
├── Product Detail Screen
│   ├── Image Gallery
│   ├── Size / Variant Selector
│   ├── Reviews Section
│   └── Add to Cart → Cart Screen
├── Cart Screen
│   └── → Checkout Screen
├── Checkout Screen
│   └── → Order Confirmation Screen
├── Order Confirmation Screen
├── Printing Services Screen
│   ├── Design Uploader
│   ├── Product Selector
│   └── → Checkout Screen
├── Sports Services Screen
│   └── Service Detail Screen
│       └── Book Service Screen
└── Orders Screen
    └── Order Detail Screen
        └── Track Order Screen
```

---

## Profile Tab Stack

```
Profile Tab
├── Profile Screen (root)
│   ├── Edit Profile Screen
│   ├── Achievements Screen
│   │   └── Badge Detail Bottom Sheet
│   ├── Membership Screen
│   │   ├── Active Membership Detail
│   │   └── Upgrade Plan Screen
│   ├── Bookings Screen
│   │   └── Booking Detail Screen
│   │       ├── Cancel Booking Sheet
│   │       └── Reschedule Screen
│   ├── Wallet Screen
│   │   ├── Add Money Screen
│   │   └── Transaction History Screen
│   ├── Rewards Screen
│   │   └── Redeem Reward Sheet
│   ├── Settings Screen
│   │   ├── Notification Settings
│   │   ├── Privacy Settings
│   │   ├── Account Settings
│   │   ├── Language & Region
│   │   ├── Appearance (Light/Dark/Auto)
│   │   └── Data & Storage
│   ├── Support Screen
│   │   ├── FAQ Screen
│   │   ├── Chat Support Screen
│   │   └── Report Issue Screen
│   └── Logout Confirmation Sheet
└── Public Player Profile Screen (viewed from community/games)
    ├── Achievements
    ├── Activity Feed
    └── Follow / Message Actions
```

---

## Booking Flow (Cross-Tab)

The booking flow is a modal stack that can be triggered from Home, Explore, and Play tabs without losing the originating tab context.

```
Booking Modal Stack
├── Venue Detail (entry point)
├── Sport Selection
├── Court Selection
│   └── Court Detail Sheet
├── Date Selection (Calendar)
├── Time Slot Selection
├── Add-ons / Extras
├── Booking Summary (review)
├── Payment
│   ├── Wallet
│   ├── UPI / Net Banking
│   ├── Credit / Debit Card
│   └── Add New Payment Method
└── Booking Confirmation
    ├── Success Animation
    ├── QR Code
    └── Share Sheet
```

---

## Authentication Gate Screens

Screens requiring login show an **Auth Gate Sheet** (bottom sheet) rather than redirecting away:

| Trigger | Redirects To |
|---------|-------------|
| "Book Now" (unauthenticated) | Auth Gate → Booking Flow |
| Join Game | Auth Gate → Game Detail |
| Add to Cart | Auth Gate → Cart |
| Follow Player | Auth Gate → Profile |
| Write Review | Auth Gate → Review Form |

---

## Global Overlays (Accessible from any screen)

| Overlay | Trigger |
|---------|---------|
| Notification Center | Bell icon (any header) |
| Search | Search bar tap (any screen) |
| Cart | Cart icon (Store area) |
| Quick Book | FAB (Home screen) |
| Share Sheet | Share action |
| Location Picker | Location chip (Home header) |
