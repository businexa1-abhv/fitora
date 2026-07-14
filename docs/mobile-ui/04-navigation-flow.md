# FitOra Mobile — Navigation Flow

> Version 1.0 · July 2026

---

## Navigation Architecture

FitOra uses **React Navigation 7** with the following navigator stack:

```
RootNavigator (Stack)
├── SplashScreen
├── OnboardingNavigator (Stack)  ← shown when !isAuthenticated
│   ├── WelcomeCarousel
│   ├── AuthScreen
│   ├── OTPScreen
│   └── ProfileSetupNavigator (Stack)
│       ├── SetupName
│       ├── SetupSports
│       └── SetupLocation
└── MainNavigator (BottomTabs)  ← shown when isAuthenticated
    ├── HomeNavigator (Stack)
    ├── ExploreNavigator (Stack)
    ├── PlayNavigator (Stack)
    ├── StoreNavigator (Stack)
    └── ProfileNavigator (Stack)
```

### Shared / Modal Stacks (overlaid on MainNavigator)

```
MainNavigator
├── BookingNavigator (Modal Stack)  ← presented modally over any tab
├── AuthGateSheet (Modal)           ← auth prompt from any screen
├── NotificationCenter (Modal)      ← global notification overlay
└── SearchOverlay (Modal)           ← full-screen search
```

---

## Navigation Transitions

| Transition Type | Usage | Config |
|----------------|-------|--------|
| **Slide from right** | Standard stack push | Default iOS/Android |
| **Slide from bottom** | Modal presentation, bottom sheets | `presentation: 'modal'` |
| **Fade** | Tab switching | Custom interpolator |
| **Shared Element** | Card → Detail screen | `react-navigation-shared-element` |
| **None** | Auth → Main app | Instant swap, no visual transition |

---

## Home Tab — Navigation Flow

```
HomeScreen
  │
  ├──[tap SearchBar]─────────────────────► ExploreTab (switchTab)
  │
  ├──[tap NotificationBell]──────────────► NotificationCenter (Modal)
  │
  ├──[tap LocationChip]──────────────────► LocationPickerSheet (BottomSheet)
  │
  ├──[tap SportChip]─────────────────────► SportCategoryScreen (Push)
  │                                             └──[tap VenueCard]──► VenueDetail (Push)
  │
  ├──[tap VenueCard (Nearby)]────────────► VenueDetail (Push, SharedElement)
  │
  ├──[tap CoachCard]─────────────────────► CoachDetail (Push, SharedElement)
  │
  ├──[tap GameCard]──────────────────────► GameDetail in PlayTab (Cross-tab)
  │
  ├──[tap EventCard]─────────────────────► EventDetail (Push)
  │
  ├──[tap Membership Plan]───────────────► MembershipScreen (Push)
  │
  ├──[tap ProductCard]───────────────────► ProductDetail in StoreTab (Cross-tab)
  │
  ├──[tap CommunityPost]─────────────────► PostDetail (Push)
  │
  └──[tap FAB "Quick Book"]──────────────► ExploreTab (switchTab, focus search)
```

---

## Venue Detail — Booking Navigation Flow

```
VenueDetail
  │
  ├──[tap "Book Now" / Sticky CTA]
  │     │
  │     └──[if !authenticated]──────────► AuthGateSheet
  │           └──[after auth]────────────► SportSelectionScreen (Modal Stack)
  │
  └──[if authenticated]───────────────────► SportSelectionScreen (Modal Stack begins)
        │
        └──[select sport]───────────────► CourtSelectionScreen
              │
              └──[select court]─────────► DateSelectionScreen
                    │
                    └──[select date]──────► TimeSlotScreen
                          │
                          └──[select time]► AddOnsScreen (optional)
                                │
                                └──────────► BookingSummaryScreen
                                                  │
                                                  ├──[tap Edit]────────────► back to relevant step
                                                  │
                                                  └──[tap Confirm & Pay]───► PaymentScreen
                                                                                  │
                                                                                  ├──[payment success]─► BookingConfirmationScreen
                                                                                  │                           └──[dismiss]──► HomeScreen (tab switch)
                                                                                  │
                                                                                  └──[payment failure]─► PaymentErrorScreen
                                                                                                              └──[retry]──► PaymentScreen
```

---

## Explore Tab — Navigation Flow

```
ExploreScreen
  │
  ├──[tap SearchBar]──────────────────────► SearchResultsScreen (Push or inline)
  │     └──[tap result]──────────────────► VenueDetail (Push)
  │
  ├──[tap Filter button]─────────────────► FilterSheet (BottomSheet)
  │     └──[apply filters]──────────────► ExploreScreen (filtered results)
  │
  ├──[tap MapPin / VenueCard]────────────► VenueDetail (Push, SharedElement)
  │
  ├──[tap Map/List toggle]──────────────► Animated transition between modes
  │
  └──[drag MapBottomSheet up]────────────► Expanded venue list
```

---

## Play Tab — Navigation Flow

```
PlayHubScreen
  │
  ├──[Discover tab]
  │     ├──[tap GameCard]───────────────► GameDetailScreen (Push)
  │     │     ├──[tap "Join"]───────────► JoinGameSheet (BottomSheet)
  │     │     │     └──[confirm]────────► PaymentScreen → GameJoinedConfirmation
  │     │     └──[tap PlayerAvatar]─────► PublicPlayerProfile (Push)
  │     │
  │     └──[tap "Create Game"]──────────► CreateGameNavigator (Modal Stack)
  │           ├── SportSelection
  │           ├── VenueSelection (embeds ExploreScreen)
  │           ├── DateTimeSelection
  │           ├── GameSettings
  │           └── InviteFriends → GameCreatedConfirmation
  │
  ├──[My Games tab]
  │     ├──[tap GameCard]───────────────► GameDetailScreen (Push)
  │     └──[tap InvitationCard]─────────► InvitationDetailSheet (BottomSheet)
  │           ├──[Accept]───────────────► PaymentScreen → HomeScreen
  │           └──[Decline]──────────────► dismiss sheet
  │
  └──[Friends tab]
        └──[tap FriendActivity]─────────► GameDetailScreen or PublicProfile
```

---

## Store Tab — Navigation Flow

```
StoreHomeScreen
  │
  ├──[tap Category (Equipment etc.)]─────► CategoryScreen (Push)
  │     └──[tap ProductCard]────────────► ProductDetailScreen (Push, SharedElement)
  │           ├──[tap "Add to Cart"]─────► CartIcon badge animates (+1)
  │           └──[tap "Buy Now"]─────────► CheckoutScreen (Modal)
  │
  ├──[tap FeaturedBanner]────────────────► CategoryScreen or ProductDetail
  │
  ├──[tap CartIcon]──────────────────────► CartScreen (Push)
  │     └──[tap "Checkout"]────────────► CheckoutScreen (Push)
  │           └──[order placed]─────────► OrderConfirmationScreen
  │
  ├──[tap PrintingServices]──────────────► PrintingServicesScreen (Push)
  │     └──[configure + add to cart]────► CartScreen
  │
  └──[tap SportsServices]────────────────► ServicesScreen (Push)
        └──[tap ServiceCard]────────────► ServiceDetailScreen
              └──[tap "Book Service"]───► BookingFlow (reuses Booking Navigator)
```

---

## Profile Tab — Navigation Flow

```
ProfileScreen
  │
  ├──[tap EditProfile]────────────────────► EditProfileScreen (Push)
  │
  ├──[tap Achievements]───────────────────► AchievementsScreen (Push)
  │     └──[tap BadgeCard]────────────────► BadgeDetailSheet (BottomSheet)
  │
  ├──[tap Membership]─────────────────────► MembershipScreen (Push)
  │     └──[tap Upgrade]──────────────────► UpgradePlanScreen
  │           └──[select plan + pay]──────► PaymentScreen → MembershipConfirmation
  │
  ├──[tap Bookings]───────────────────────► BookingsScreen (Push)
  │     └──[tap BookingCard]─────────────► BookingDetailScreen (Push)
  │           ├──[tap Cancel]────────────► CancelBookingSheet (BottomSheet) → confirmation
  │           └──[tap Reschedule]────────► RescheduleScreen (Push) → Booking flow step
  │
  ├──[tap Wallet]─────────────────────────► WalletScreen (Push)
  │     └──[tap Add Money]───────────────► AddMoneyScreen → PaymentScreen
  │
  ├──[tap Rewards]────────────────────────► RewardsScreen (Push)
  │     └──[tap Redeem]───────────────────► RedeemSheet (BottomSheet)
  │
  ├──[tap Settings]───────────────────────► SettingsScreen (Push)
  │     ├──[tap Notifications]────────────► NotificationSettingsScreen
  │     ├──[tap Appearance]──────────────► AppearanceScreen (Light/Dark/Auto)
  │     └──[tap Account]──────────────────► AccountSettingsScreen
  │           └──[tap Delete Account]──────► DeleteAccountConfirmation (Destructive Sheet)
  │
  ├──[tap Support]────────────────────────► SupportScreen (Push)
  │     ├──[tap Chat]────────────────────► ChatSupportScreen
  │     ├──[tap FAQ]─────────────────────► FAQScreen
  │     └──[tap Report Issue]────────────► ReportIssueScreen
  │
  └──[tap Logout]─────────────────────────► LogoutConfirmationSheet (BottomSheet)
        └──[confirm]────────────────────► OnboardingNavigator (stack reset)
```

---

## Authentication Gate Flow

When an unauthenticated user triggers a protected action:

```
ProtectedAction (e.g. "Book Now")
  │
  └──[!isAuthenticated]
        │
        └──► AuthGateSheet appears (BottomSheet, 75% height)
              │
              ├──[tap Phone Login]──────► PhoneInputSheet (replaces content)
              │     └──[enter phone]───► OTPSheet
              │           └──[verified]► dismiss sheet, resume original action
              │
              ├──[tap Google]──────────► Google OAuth flow
              │     └──[success]───────► dismiss sheet, resume original action
              │
              └──[tap Apple]──────────► Apple Sign In flow
                    └──[success]───────► dismiss sheet, resume original action
```

---

## Deep Link Map

| Deep Link | Destination |
|-----------|-------------|
| `fitora://venue/:id` | VenueDetailScreen |
| `fitora://game/:id` | GameDetailScreen |
| `fitora://booking/:id` | BookingDetailScreen |
| `fitora://coach/:id` | CoachDetailScreen |
| `fitora://event/:id` | EventDetailScreen |
| `fitora://product/:id` | ProductDetailScreen |
| `fitora://profile/:username` | PublicPlayerProfile |
| `fitora://invite/:gameId` | Game invite deep link → JoinGameSheet |
| `fitora://promo/:code` | StoreHome with promo applied |

---

## Tab Switching Behavior

| Action | Behavior |
|--------|---------|
| Tap active tab | Scroll to top of list (if scrolled) |
| Tap active tab (at top) | Refresh data |
| Switch tab | Preserve scroll position and navigation stack |
| Badge on tab | Indicates unread count (Play invites, Store cart) |

---

## Back Navigation

| Platform | Gesture | Behavior |
|----------|---------|---------|
| iOS | Swipe right edge | Standard iOS swipe back |
| Android | System back button | Navigate back in stack |
| Both | Header back arrow | Navigate back, dismiss modal |

Modal stacks are dismissed with a **downward swipe** gesture (swipe from handle bar).

---

## Cross-Tab Navigation

When navigating from one tab's stack to another tab's content (e.g., Home → PlayTab for a game), FitOra uses **tab switching + deep navigation** rather than cross-stack linking:

1. Switch active tab to the target tab
2. Push the target screen onto that tab's stack
3. On back press, return to that tab's previous state (not originating tab)

This preserves each tab's navigation history and matches user mental model.
