# FitOra Design System — Orbit UI

## Brand
- **App name:** FitOra
- **Tagline:** India's All-in-One Sports Platform
- **Design language:** Material Design 3 (Material You)
- **Platform:** React Native (Expo) + Next.js Web
- **Market:** India — mobile-first, UPI payments, local sports

---

## Color Tokens

### Primary Palette
- `--color-primary`: #FF6B35 (FitOra Orange)
- `--color-primary-dark`: #E55520
- `--color-primary-container`: #FFF1EB
- `--color-on-primary`: #FFFFFF
- `--color-on-primary-container`: #7A2800

### Secondary / Accent
- `--color-accent`: #F59E0B
- `--color-accent-container`: #FEF3C7
- `--color-on-accent`: #FFFFFF

### Semantic
- `--color-success`: #059669
- `--color-success-container`: #D1FAE5
- `--color-warning`: #D97706
- `--color-warning-container`: #FEF3C7
- `--color-danger`: #DC2626
- `--color-danger-container`: #FEE2E2
- `--color-info`: #2563EB
- `--color-info-container`: #DBEAFE

### Neutrals (warm, slight orange undertone)
- `--color-background`: #FFFBF8
- `--color-surface`: #FFFFFF
- `--color-surface-container-lowest`: #FFFFFF
- `--color-surface-container-low`: #FEF6F2
- `--color-surface-container`: #F8EEE9
- `--color-surface-container-high`: #F2E5DF
- `--color-surface-container-highest`: #EDD9D2
- `--color-outline`: #C4A99F
- `--color-outline-variant`: #E8D5CE
- `--color-on-surface`: #1A1210
- `--color-on-surface-variant`: #5C4039

### Dark Mode equivalents
- `--color-background-dark`: #1A1210
- `--color-surface-dark`: #241917
- `--color-surface-container-dark`: #2E201D
- `--color-on-surface-dark`: #F0DDD7

---

## Typography

### Font Families
- **Display / Heading:** Plus Jakarta Sans (Google Fonts)
- **Body / UI:** Inter (Google Fonts)
- **Mono:** JetBrains Mono (prices, codes)

### Type Scale (MD3)
| Role | Font | Weight | Size | Line Height |
|------|------|--------|------|-------------|
| Display Large | Plus Jakarta Sans | 700 | 57px / 36sp | 64px |
| Display Medium | Plus Jakarta Sans | 700 | 45px / 28sp | 52px |
| Display Small | Plus Jakarta Sans | 600 | 36px / 22sp | 44px |
| Headline Large | Plus Jakarta Sans | 700 | 32px / 20sp | 40px |
| Headline Medium | Plus Jakarta Sans | 600 | 28px / 18sp | 36px |
| Headline Small | Plus Jakarta Sans | 600 | 24px / 15sp | 32px |
| Title Large | Plus Jakarta Sans | 600 | 22px / 14sp | 28px |
| Title Medium | Inter | 600 | 16px / 10sp | 24px |
| Title Small | Inter | 600 | 14px / 9sp | 20px |
| Body Large | Inter | 400 | 16px / 10sp | 24px |
| Body Medium | Inter | 400 | 14px / 9sp | 20px |
| Body Small | Inter | 400 | 12px / 8sp | 16px |
| Label Large | Inter | 600 | 14px / 9sp | 20px |
| Label Medium | Inter | 500 | 12px / 8sp | 16px |
| Label Small | Inter | 500 | 11px | 16px |

---

## Spacing & Sizing

| Token | Value | Use |
|-------|-------|-----|
| `--space-xs` | 4px / 2sp | Icon gap, micro padding |
| `--space-sm` | 8px / 4sp | Inner component padding |
| `--space-md` | 16px / 8sp | Standard padding, gutter |
| `--space-lg` | 24px / 12sp | Card padding, section gap |
| `--space-xl` | 32px / 16sp | Section margin |
| `--space-2xl` | 48px | Hero padding |
| `--space-3xl` | 64px | Page section gap |

### Touch targets
- Minimum: 48×48dp (Android) / 44×44pt (iOS)
- Preferred CTA: 56dp height

---

## Shape / Corner Radius

| Token | Value | Used on |
|-------|-------|---------|
| `--radius-xs` | 4px | Badges, small tags |
| `--radius-sm` | 8px | Buttons, inputs |
| `--radius-md` | 12px | Cards, list tiles |
| `--radius-lg` | 16px | Bottom sheets, modals |
| `--radius-xl` | 24px | Chips, pills, FAB |
| `--radius-full` | 9999px | Avatar, circular buttons |

---

## Elevation (MD3 Tonal Surface Steps)

| Level | Token | Shadow | Use |
|-------|-------|--------|-----|
| 0 | surface | none | Background |
| 1 | surface-container-low | subtle | Cards at rest |
| 2 | surface-container | light | Elevated cards |
| 3 | surface-container-high | medium | Drawers, sheets |
| 4 | surface-container-highest | stronger | Dialogs, modals |

---

## Components

### Buttons
- **Filled** (primary CTA): bg=primary, text=white, radius=sm, height=48dp, font=Label Large
- **Filled Tonal**: bg=primary-container, text=on-primary-container
- **Outlined**: border=outline, text=primary, bg=transparent
- **Text**: text=primary, no border/bg
- **FAB**: bg=primary-container, icon+label, radius=xl, elevation=3
- **States:** hover (+8% overlay), pressed (+16% overlay), disabled (38% opacity)

### Cards
- **Venue Card**: photo (16:9), sport chip, name (Title Medium), area+rating row, price+availability, CTA button
- **Booking Card**: sport icon, venue name, date+time, court number, status chip, QR button
- **Event Card**: banner image, sport tag, title, date, venue, "Join" CTA
- **Product Card**: square photo, name, rating stars, price, add-to-cart icon button
- radius=md, elevation=1, padding=md

### Chips (MD3 Filter Chips)
- **Sport chip**: icon + label, radius=xl, bg=surface-container, active=primary-container+primary text
- **Status chip Available**: bg=success-container, text=success
- **Status chip Booked**: bg=surface-container-highest, text=on-surface-variant
- **Status chip Selected**: bg=primary, text=white
- **Date chip**: label only, radius=xl

### Navigation (Mobile)
- **MD3 Navigation Bar**: 5 tabs, surfaceContainer bg, active indicator pill (primary-container), icon+label
- Tab order: Home | Explore | Play | Store | Profile
- Play tab uses primary color active indicator (stronger emphasis)
- Badge: red dot for notifications, number badge for cart

### Navigation (Web)
- **Top nav bar**: logo + nav links + city/sport selectors + bell + cart + avatar
- Sticky on scroll, shadow elevation 2
- Mobile: hamburger → drawer

### Input Fields (MD3)
- **Outlined text field**: label floats, border=outline, focus=primary, radius=xs top
- **Filled text field**: bg=surface-container, underline only
- **Search bar**: full-width, leading search icon, trailing clear, radius=xl

### Time Slot Grid
- Grid of pill buttons (label = time "06:00")
- Available: outlined, text=on-surface
- Booked: bg=surface-container-highest, text=on-surface-variant, disabled
- Selected: bg=primary, text=white
- Hover: bg=primary-container

### Bottom Sheets (Mobile)
- Drag handle, radius=lg top corners, bg=surface
- Filters sheet: sport multiselect, price slider, amenity toggles

### Top App Bars (Mobile, MD3)
- **Large**: collapsing title (Display Small → Title Large on scroll), surfaceContainer bg
- **Medium**: collapsing, used for detail pages
- **Small/center**: used for modal flows (back icon + title + actions)

### List Tiles (Profile menu)
- Leading icon (on-surface-variant), title (Body Large), optional trailing icon
- Divider between groups
- Danger tile (Logout): text=danger

---

## Iconography
- **Library:** Material Symbols Rounded (Google)
- **Sizes:** 20dp (inline/chip), 24dp (nav/button), 32dp (feature icons), 48dp (empty states)
- **Sport icons (custom):** Badminton shuttle, Cricket bat, Football, Tennis racket, Swimming, Gym dumbbell
- **Weight:** 400 (default), 600 (active nav)

---

## Motion

| Pattern | Duration | Easing |
|---------|----------|--------|
| Page transition | 300ms | emphasized (cubic-bezier(0.2,0,0,1)) |
| Card appear | 200ms | standard |
| Bottom sheet | 250ms | emphasized decelerate |
| Button press | 100ms | standard |
| Skeleton shimmer | 1500ms | linear loop |

---

## Accessibility
- All text meets WCAG AA contrast (4.5:1 body, 3:1 large)
- Focus rings: 2px offset, primary color
- Touch targets: 48×48dp minimum
- Reduced motion: disable shimmer, simplify transitions
- Screen reader labels on all icon-only buttons

---

## Screen Specifications — Mobile (390×844, React Native Expo)

### 1. Home Tab
- Large collapsing top app bar: "Good morning, Harsha" + city chip (Hyderabad) + notification bell + avatar
- **Upcoming booking card**: court photo thumbnail, "Badminton @ Smash Arena", "Today 6:00 PM", countdown "In 2h 15m", orange "Check In" button + QR icon
- **Membership card**: orange gradient, "Gold Member", "Badminton", "Valid till Dec 2026", usage bar
- **Friends playing section**: horizontal avatar row, each with name + venue label below
- **Open games nearby**: horizontal swipeable cards — sport icon, venue, time, "3 spots left" chip, "Join" button
- **Kids programs** (parent role): child avatar, "Arjun's Badminton Batch", "Next: Tomorrow 7 AM"
- **Recommended venues**: horizontal scroll, venue cards

### 2. Explore Tab
- MD3 Search bar (full width, always expanded): "Search venues, sports, events..."
- Sport filter chips row: All | Badminton | Cricket | Football | Tennis | Swimming | Gym
- "Trending Near You" section — vertical venue card list
- "Upcoming Events" — full-width event banner cards
- "Academies" — coach photo + details cards

### 3. Play Tab
- **Book a Court** section header
  - Sport selector grid (2×3): each cell = sport icon + sport name, selected = primary fill
  - Date chips row: Today | Tomorrow | Wed 16 | Thu 17 | + calendar icon
  - Venue results list below
- **My Upcoming Games** section
  - Booking cards: venue photo, sport chip, date+time, court, status, "Get QR" button
- **Open Games** section

### 4. Booking Flow — Screen A: Venue Detail Sheet
- Swipeable photo gallery (full-width, 16:9)
- Drag handle
- Venue name (Headline Small), sport chips, verified badge
- Rating: 4.8 ⭐ (324 reviews)
- Amenities icon row: Parking, Changing Room, Cafeteria, AC, Equipment Rental
- Description text (Body Medium)
- "Book Now" primary filled button (full-width)

### 5. Booking Flow — Screen B: Slot Selector
- Top: Date chips row
- Court tabs: Court 1 | Court 2 | Court 3
- Time slot grid (2-column): 06:00 to 22:00, 1-hour slots
  - Available: outlined pill
  - Booked: grey filled pill (disabled)
  - Selected: orange filled pill
- Duration selector chips: 1 hr | 1.5 hr | 2 hr
- Sticky bottom: "2 slots selected · ₹900" + "Continue" button

### 6. Booking Flow — Screen C: Booking Summary
- Back arrow + "Confirm Booking" title
- Venue card (compact): photo thumbnail, name, court, date, time
- Price breakdown list tile:
  - Court fee: ₹800
  - Convenience fee: ₹50
  - GST (18%): ₹153
  - **Total: ₹1,003**
- Payment method section: UPI pill | Card pill | Wallet pill
- UPI options: GPay, PhonePe, Paytm app icons
- Full-width "Pay ₹1,003 & Confirm" primary button
- Razorpay secured badge

### 7. Booking Flow — Screen D: Booking Confirmed
- Full-screen success state
- Large orange animated checkmark (72dp) in primary-container circle
- "Booking Confirmed!" (Headline Large, primary)
- Booking ID: #FIT-2026-88421
- Summary: venue, court, date, time
- Large QR code (240×240) with "Show at venue" label
- Secondary: "Add to Calendar" + "Share" buttons
- "View All Bookings" text button

### 8. Store Tab
- Search bar
- Category chips: All | Gear | Stringing | Repair | Printing | Rentals
- "Flash Sale" — full-width banner (orange gradient, white text)
- Product grid (2 columns): photo, name, rating, price, add-to-cart icon
- "Services Near You" section: service provider cards with avatar, service, price, rating

### 9. Profile Tab
- Profile header: avatar (80dp), name "Harsha Reddy", "Player" badge chip, edit icon
- Sports Passport card: sport icons played, "47 courts booked", 3 achievement badges
- Menu sections with dividers:
  - My Bookings (calendar icon)
  - My Memberships (card icon)
  - Kids Profiles (child icon)
  - My Orders (package icon)
  - Wallet & Payments (wallet icon)
  - ——
  - Notification Settings (bell icon)
  - Help & Support (help icon)
  - ——
  - Logout (danger color, exit icon)
- "Refer a Friend" banner (accent yellow, "Earn ₹100 per referral")

---

## Screen Specifications — Web (1280px desktop + 375px mobile responsive)

### 1. Public Homepage (/)
- **Hero**: full-width, dark overlay on sport photography, "Book Courts. Join Games. Train Together." (Display Large, white), city selector pill + sport filter chips, "Find a Venue" primary CTA + "List Your Venue" outlined CTA
- **Sport quick links**: 6 icon+label cards in a row (Badminton, Cricket, Football, Tennis, Swimming, Gym)
- **Featured Venues**: 3-column card grid, venue cards with photo, name, sport, rating, price, "Book Now"
- **Events banner**: full-width orange gradient section, upcoming tournament cards
- **Academies spotlight**: 2-column layout, academy cards
- **Social proof**: "5,000+ players trust FitOra in Hyderabad & Bengaluru"
- **App download**: split section, mockup image, iOS+Android store buttons
- **Footer**: 4-column, FitOra logo, links, cities, sports, social icons, legal

### 2. Venue Discovery (/venues)
- Sticky header with search + City filter + Sport chips + Sort
- **Left sidebar** (280px): filter panel — Sport checkboxes, Price range slider, Amenities toggles, Available date picker, Rating filter, Clear All
- **Main content** (fluid): venue card grid (3 col desktop, 2 col tablet, 1 col mobile)
- Venue card: hero photo, sport chip, verified badge, name, area, rating, price/hr, "Book Now" button
- **Map toggle**: List | Map | Split view buttons top-right
- Results count: "48 venues in Hyderabad"

### 3. Venue Detail (/venues/[id])
- Photo gallery: 1 large + 4 small in mosaic layout
- Name (Headline Large), sport chips, verified badge, rating+reviews count
- **Sticky booking sidebar** (360px right): date picker, court tabs, time slot grid, price summary, "Proceed to Pay" button
- Tabs (below gallery): Overview | Book | Reviews | Policies
- Amenities icon grid
- Location map embed
- Review cards: avatar, name, rating stars, date, text

### 4. Player Dashboard (/dashboard)
- Greeting: "Good morning, Harsha 👋" + date
- **4 quick action cards**: Book Court | My Games | Kids Programs | Orders
- **Upcoming bookings**: timeline list, next booking highlighted with check-in CTA
- **Active membership**: card with plan name, sport, expiry, usage
- **Friends activity feed**: "Rahul played at Smash Arena · 2h ago"
- **Recommended venues**: horizontal scroll

### 5. Academies (/academies)
- Hero banner: "Give Your Child the Champion's Start"
- Filter bar: Sport | Age Group | Area | Fee range
- Academy card grid: photo, academy name, sport, age range, coach, batch timings, monthly fee, "Enroll Now"
- **Featured coaches** section: large photo cards, name, sport, experience, rating
