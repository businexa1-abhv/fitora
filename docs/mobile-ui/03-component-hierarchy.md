# FitOra Mobile — Component Hierarchy

> Version 1.0 · July 2026

---

## Architecture Principles

- **Atomic Design** methodology: Atoms → Molecules → Organisms → Templates → Screens
- Every component is **theme-aware** (light / dark)
- Every interactive component has **loading**, **error**, and **empty** states
- Components use **compound pattern** where composition complexity is high
- Design tokens from `07-design-tokens.md` are the single source of truth

---

## Level 1 — Atoms (Primitive Elements)

### Typography

| Component | Props | Notes |
|-----------|-------|-------|
| `Text` | `variant`, `color`, `align`, `numberOfLines` | Maps to type scale |
| `DisplayText` | `size` (xl/lg/md), `color` | Hero/section headlines |
| `BodyText` | `size` (lg/md/sm), `color` | Body copy |
| `LabelText` | `size` (lg/md/sm), `color` | UI labels, buttons |
| `CaptionText` | `color` | Meta, timestamps |

### Primitives

| Component | Props | Notes |
|-----------|-------|-------|
| `Box` | `padding`, `margin`, `flex`, `bg`, `radius` | Style utility wrapper |
| `Stack` | `direction`, `gap`, `align`, `justify` | Flex layout helper |
| `Divider` | `orientation`, `color`, `thickness` | Horizontal/vertical separator |
| `Spacer` | `size` | Fixed/flexible space |
| `SafeAreaBox` | `edges` | Safe area aware container |

### Visual

| Component | Props | Notes |
|-----------|-------|-------|
| `Icon` | `name`, `size`, `color`, `weight` | Phosphor icons wrapper |
| `SportIcon` | `sport`, `size` | Custom sport SVG icons |
| `Avatar` | `uri`, `name`, `size`, `badge` | Image with fallback initials |
| `Badge` | `value`, `variant`, `size` | Numeric or dot badge |
| `ColorSwatch` | `color`, `selected` | Color picker atom |
| `ProgressBar` | `value`, `max`, `color` | Linear progress |
| `ProgressRing` | `value`, `max`, `size`, `color` | Circular progress (Apple-style) |

---

## Level 2 — Molecules (Functional Groups)

### Inputs

| Component | Anatomy | Notes |
|-----------|---------|-------|
| `TextInput` | Label + Input + Helper/Error | Floating label animation |
| `SearchInput` | Icon + Input + Clear button | Rounded pill style |
| `PhoneInput` | Country flag + Code + Input | International support |
| `OTPInput` | 6× `OTPBox` + auto-advance | Animated focus, shake on error |
| `PasswordInput` | TextInput + show/hide toggle | — |
| `TextArea` | Label + Multi-line input + char count | — |
| `SelectInput` | Label + Value + Chevron | Opens bottom sheet picker |
| `DateInput` | Label + formatted date + Calendar icon | Opens date picker sheet |

### Buttons

| Component | Variants | Notes |
|-----------|----------|-------|
| `Button` | `primary`, `secondary`, `ghost`, `danger` | Full / Half / Auto width |
| `IconButton` | `filled`, `outlined`, `ghost` | Square or circular |
| `FAB` | `standard`, `extended` | Floating action button |
| `ChipButton` | `filled`, `outlined` | Filter chips, sport chips |
| `SocialButton` | `google`, `apple` | Auth providers |
| `LoadingButton` | wraps Button | Shows spinner, disables tap |

### Selectors

| Component | Usage |
|-----------|-------|
| `RadioGroup` | Single selection list |
| `CheckboxGroup` | Multi selection list |
| `Toggle` | Binary on/off |
| `SegmentedControl` | 2–4 option tabs (e.g., Map/List) |
| `StarRating` | Interactive + display modes |
| `SliderInput` | Range selection (price, distance) |
| `StepperInput` | Increment/decrement (player count) |

### Feedback

| Component | Usage |
|-----------|-------|
| `Skeleton` | Content placeholder shimmer |
| `SkeletonCard` | Pre-shaped card skeleton |
| `SkeletonAvatar` | Circular shimmer |
| `SkeletonText` | Line-height matched text shimmer |
| `Spinner` | Brand-colored activity indicator |
| `Toast` | Bottom-anchored notification (success/error/info) |
| `Snackbar` | Action-bearing notification |
| `InlineError` | Field-level error message |
| `Banner` | Full-width info/warning strip |

---

## Level 3 — Organisms (Feature Components)

### Navigation

| Component | Description |
|-----------|-------------|
| `BottomTabBar` | 5-tab animated navigation bar |
| `TabBarItem` | Individual tab with animated icon + label |
| `ScreenHeader` | Title, back button, right actions |
| `LargeScreenHeader` | Greeting-style header with avatar/notification |
| `SearchHeader` | Sticky search with back navigation |
| `StickyFilterBar` | Horizontal filter chips that stick on scroll |

### Cards — Venue

| Component | Size | Key Info |
|-----------|------|----------|
| `VenueCard` | Large (horizontal scroll) | Image, name, rating, distance, sport chips, price |
| `VenueCardCompact` | Small (list) | Thumbnail, name, rating, distance, open status |
| `VenueCardHero` | Full-width | Large image, gradient overlay, featured badge |
| `VenueCardMap` | Mini (map callout) | Thumbnail, name, price, book CTA |

### Cards — Coach

| Component | Size | Key Info |
|-----------|------|----------|
| `CoachCard` | Medium (portrait) | Photo, name, sport, rating, price/session, availability |
| `CoachCardCompact` | List row | Avatar, name, specialty, rating |
| `CoachProfileHeader` | Full screen top | Large photo, bio, stats, follow |

### Cards — Game

| Component | Size | Key Info |
|-----------|------|----------|
| `GameCard` | Standard | Sport, venue name, date/time, slots remaining, player avatars |
| `GameCardFeatured` | Large | Hero image, sport badge, quick join |
| `GameInviteCard` | Notification-style | Inviter avatar, game info, accept/decline |

### Cards — Product

| Component | Size | Key Info |
|-----------|------|----------|
| `ProductCard` | Grid (2-col) | Image, name, price, rating, add-to-cart |
| `ProductCardHorizontal` | List | Thumbnail, name, specs, price |
| `ProductCardFeatured` | Wide | Large image, sale badge, CTA |

### Cards — Event

| Component | Size | Key Info |
|-----------|------|----------|
| `EventCard` | Standard | Image, title, date, location, price, going count |
| `EventCardFeatured` | Large | Full-bleed, gradient title, countdown |

### Carousels

| Component | Content | Behavior |
|-----------|---------|---------|
| `HorizontalCarousel` | Any card | Peek next card, pagination dots |
| `HeroCarousel` | Full-width hero cards | Auto-play, dots indicator |
| `SportCategoryCarousel` | Sport chips | Horizontal scroll, no pagination |
| `AvatarStack` | Player avatars | Overlapping circles, +N overflow |

### Lists

| Component | Usage |
|-----------|-------|
| `SectionList` | Grouped data with sticky headers |
| `VenueList` | Optimized venue FlatList |
| `TimeSlotGrid` | Available/booked/selected time grid |
| `CourtGrid` | Court visual selector |
| `AmenityList` | Icon + label amenity chips |

### Search & Filter

| Component | Description |
|-----------|-------------|
| `SearchBar` | Rounded input with location context |
| `FilterSheet` | Bottom sheet with all filter options |
| `FilterChipRow` | Scrollable applied filter chips |
| `ActiveFilterBadge` | Count badge on filter button |
| `SortMenu` | Sort options sheet (distance, price, rating) |

### Booking

| Component | Description |
|-----------|-------------|
| `CalendarPicker` | Month calendar with available dates highlighted |
| `TimeSlotPicker` | Grid of time slots with status colors |
| `CourtSelector` | Visual court map / list selector |
| `BookingSummaryCard` | Venue, sport, time, total price |
| `PaymentMethodSelector` | Wallet, UPI, card option list |
| `BookingQRCode` | QR with venue name and booking ID |
| `BookingConfirmation` | Lottie success + QR + share button |

### Community

| Component | Description |
|-----------|-------------|
| `PlayerProfileCard` | Avatar, name, sport badges, follow button |
| `ActivityFeedItem` | Action + timestamp + likes/comments |
| `SportBadge` | Earned badge with sport icon and level |
| `AchievementCard` | Achievement with progress ring and title |
| `CommentItem` | Avatar + comment text + like |
| `ReactionBar` | Like, comment, share row |

### Maps

| Component | Description |
|-----------|-------------|
| `MapView` | Google Maps / Apple Maps base |
| `VenueMarker` | Custom marker with sport icon and price |
| `ClusterMarker` | Grouped marker for dense areas |
| `UserLocationMarker` | Animated pulsing dot |
| `MapBottomSheet` | Venue list draggable over map |
| `FullScreenMap` | Explore tab primary map |

### Profile & Gamification

| Component | Description |
|-----------|-------------|
| `ProfileHero` | Avatar, name, level, stats row |
| `StatCard` | Single metric (games played, hours, etc.) |
| `MembershipBadge` | Tier badge (Silver, Gold, Platinum) |
| `WalletBalance` | Amount, top-up CTA |
| `RewardItem` | Reward with points cost and redeem button |
| `LevelProgress` | XP progress bar with next level preview |

---

## Level 4 — Patterns (Repeated UX Patterns)

### Bottom Sheets

All sheets use `@gorhom/bottom-sheet` with the following standard configurations:

| Sheet | Snap Points | Backdrop |
|-------|-------------|---------|
| Auth Sheet | `['70%', '90%']` | Dark overlay |
| Filter Sheet | `['60%', '85%']` | Dark overlay |
| Court Detail | `['40%']` | Transparent |
| Booking Summary | `['50%', '90%']` | Dark overlay |
| Payment Sheet | `['80%']` | Dark overlay |
| Invite Accept | `['35%']` | Dark overlay |
| Logout Confirm | `['30%']` | Dark overlay |
| Location Picker | `['50%', '70%']` | Dark overlay |

### Pull to Refresh

All scrollable feeds use pull-to-refresh with:
- Brand orange `RefreshControl` tint
- Subtle haptic on trigger

### Infinite Scroll

List screens use cursor-based pagination with:
- `SkeletonCard` × 3 at bottom while loading
- "No more results" footer message

### Swipe Actions

| Screen | Swipe Action |
|--------|-------------|
| Booking list | Swipe left → Cancel / Reschedule |
| Cart items | Swipe left → Remove |
| Notifications | Swipe left → Dismiss |

### Sticky Elements

| Element | Behavior |
|---------|---------|
| Filter bar (Explore) | Sticks below header on scroll |
| "Book Now" CTA (Venue Detail) | Sticky bottom bar |
| Section headers (Settings) | Sticky section labels |

---

## Level 5 — Screen Compositions

### Home Screen Template

```
SafeAreaBox
├── LargeScreenHeader
├── ScrollView (with RefreshControl)
│   ├── SearchBar (tappable, leads to Explore)
│   ├── SportCategoryCarousel
│   ├── [ContinueBookingCard] (conditional)
│   ├── SectionRow: "Nearby Venues" + See All
│   │   └── HorizontalCarousel<VenueCard>
│   ├── SectionRow: "Popular Sports"
│   │   └── SportGrid (2 cols × 3 rows)
│   ├── SectionRow: "Top Coaches" + See All
│   │   └── HorizontalCarousel<CoachCard>
│   ├── KidsAcademyBanner
│   ├── SectionRow: "Games Near You" + See All
│   │   └── HorizontalCarousel<GameCard>
│   ├── MembershipPlanCard
│   ├── SectionRow: "Shop Sports" + See All
│   │   └── HorizontalCarousel<ProductCard>
│   ├── SectionRow: "Upcoming Events"
│   │   └── HorizontalCarousel<EventCard>
│   ├── SectionRow: "For You"
│   │   └── VenueList (vertical)
│   └── CommunityFeedPreview (3 posts)
└── FAB (Quick Book)
```

### Explore Screen Template

```
SafeAreaBox
├── SearchHeader
├── StickyFilterBar
├── SegmentedControl (Map / List)
├── [Map View] or [VenueList]  ← animated transition between modes
├── MapBottomSheet (map mode only)
└── FilterSheet (portal)
```

### Venue Detail Screen Template

```
ScrollView (with collapsing header)
├── HeroImageGallery (collapsible header)
├── VenueInfoBlock (name, location, rating, tags)
├── QuickStats (distance, open hours, court count)
├── AmenityList
├── AvailableSportsSection
├── PricingSection
├── CoachesCarousel
├── PhotoGalleryGrid
├── ReviewsSection
│   ├── RatingSummary
│   └── ReviewList (top 3 + See All)
└── RelatedVenues
StickyBottom
└── BookNowBar (price + Book Now button)
```
