# FitOra Design System

**Product:** FitOra — Sports Ecosystem Platform  
**Document:** `Design-System.md`  
**Version:** 1.0  
**Status:** Complete design-system specification (no component source code)  
**Date:** July 13, 2026  
**Codename:** **Orbit UI**  
**Related:** [`Mobile-UX.md`](./Mobile-UX.md) · [`Web-UX.md`](./Web-UX.md) · [`FITORA_V2_PRD.md`](./FITORA_V2_PRD.md)

---

## 1. Purpose

**Orbit UI** is FitOra’s cross-platform design system for:

- Consumer **Web** (`apps/web`)  
- Consumer **Mobile** (Expo / React Native)  
- **Venue OS** / operator shells  
- **FitOra Command** (Super Admin)  

It encodes brand, density, motion, and accessibility so Play, Explore, Community, and SaaS surfaces feel like **one product**—modern, fast, and athletic—without cloning generic Material demos or Playo.

### 1.1 Principles

1. **Sport energy, calm chrome** — Orange for primary action; neutrals carry structure.  
2. **One language, two densities** — Comfortable (consumer) vs Compact (Command / Venue calendar).  
3. **Tonal surfaces over heavy shadow** — Elevation via surface steps (MD3-aligned).  
4. **Explainable UI** — Chips, status pills, and reason labels are first-class.  
5. **Accessible by default** — Contrast, focus, targets, reduced motion.  
6. **Token-driven** — No raw hex in product UI; themes swap tokens.  
7. **Compose, don’t snowflake** — Cards/buttons/forms share recipes.

### 1.2 Brand anchors

| Token role | Light (seed) | Notes |
|------------|--------------|-------|
| Primary | `#FF6B35` | FitOra orange |
| Primary dark / pressed | `#E55520` | |
| Primary container | `#FFF1EB` | Soft fills, chips |
| Accent (secondary highlight) | `#F59E0B` | Sparingly—goals, Pulse |
| Success | `#059669` | |
| Warning | `#D97706` | |
| Danger | `#DC2626` | |
| Info | `#2563EB` | |

Neutrals are **warm** (slight orange undertone), not green-tinted leftovers from legacy themes.

---

## 2. Foundations

### 2.1 Design tokens (layers)

```
Primitive → Semantic → Component
  hex         --color-primary    Button.bg
  space-4     --space-md         Card.padding
```

**Platforms**

| Platform | Token delivery |
|----------|----------------|
| Web | CSS variables + Tailwind `@theme` |
| Mobile | Theme objects (`Colors`, `Spacing`, `FontSize`) |
| Shared docs | This file is source of truth for names |

### 2.2 Grid & layout

| Token | Value | Use |
|-------|------:|-----|
| Columns (web) | 12 | Marketing & dashboards |
| Gutter | 16 / 24 | Mobile / desktop |
| Content max | 72rem (1152px) | Consumer content |
| Ops max | fluid | Venue OS / Command |
| Margin page | 16 → 24 → 32 | sm → md → xl |

### 2.3 Breakpoints (web)

| Name | Min width |
|------|----------:|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |

Mobile app uses size classes by device width, not CSS breakpoints.

### 2.4 Density modes

| Mode | Base unit | Used by |
|------|----------:|---------|
| **Comfortable** | 8pt grid, larger tap | Consumer web/mobile |
| **Compact** | 4–8pt, tighter tables | Command, Venue OS tables/calendar |

---

## 3. Typography

### 3.1 Font families

| Role | Web recommendation | Mobile | Character |
|------|-------------------|--------|-----------|
| **Sans (UI)** | Plus Jakarta Sans / Geist alternative already in stack—keep **expressive geometric sans** | Same family via `expo-font` | Friendly, sporty, modern |
| **Display** | Same family, extrabold | Same | Heroes, Orbit titles |
| **Mono** | Geist Mono / system mono | System mono | Booking codes, IDs, QR refs |

**Avoid:** Inter/Roboto as brand default; legal system fallback only.

### 3.2 Type scale (Comfortable)

| Token | Size / Line / Weight | Use |
|-------|----------------------|-----|
| `display.lg` | 40/48 · ExtraBold | Marketing H1 |
| `display.md` | 32/40 · ExtraBold | App screen titles |
| `display.sm` | 28/36 · Bold | Section heroes |
| `title.lg` | 22/28 · Bold | Card titles (large) |
| `title.md` | 18/24 · Bold | Card / dialog titles |
| `title.sm` | 16/22 · SemiBold | List titles |
| `body.lg` | 16/24 · Regular | Comfortable reading |
| `body.md` | 14/20 · Regular | Default UI |
| `body.sm` | 13/18 · Regular | Secondary |
| `label.lg` | 14/18 · SemiBold | Buttons, chips |
| `label.md` | 12/16 · SemiBold | Badges, tabs |
| `label.sm` | 11/14 · Medium | Overlines, meta |
| `code.md` | 13/18 · Mono | Check-in codes |

### 3.3 Type scale (Compact)

Step down ~1–2px on `body`/`label`; tables use `body.sm` + `label.md`.

### 3.4 Rules

- Max ~3 sizes per view hierarchy.  
- Prefer **sentence case** for buttons (“Book court”); Title Case for proper nouns.  
- Truncate with ellipsis; never shrink below 12px for critical UI.  
- Dynamic Type / browser zoom: layouts must reflow (no clipped CTAs).

---

## 4. Spacing

### 4.1 Space scale (8pt base)

| Token | px |
|-------|---:|
| `space.0` | 0 |
| `space.1` | 4 |
| `space.2` | 8 |
| `space.3` | 12 |
| `space.4` | 16 |
| `space.5` | 20 |
| `space.6` | 24 |
| `space.8` | 32 |
| `space.10` | 40 |
| `space.12` | 48 |
| `space.16` | 64 |

### 4.2 Usage recipes

| Context | Token |
|---------|-------|
| Inline icon gap | `space.2` |
| Form field stack | `space.4` |
| Card padding (comfortable) | `space.4`–`space.6` |
| Section gap | `space.8`–`space.12` |
| Screen edge (mobile) | `space.4` |
| Bottom nav clearance | `space.16`+ safe area |

### 4.3 Radius scale

| Token | px | Use |
|-------|---:|-----|
| `radius.sm` | 8 | Inputs compact, chips small |
| `radius.md` | 12 | Buttons, inputs |
| `radius.lg` | 16 | Cards |
| `radius.xl` | 20–24 | Sheets, large cards |
| `radius.full` | 999 | Pills, avatars |

**Avoid:** `rounded-full` on large rectangular CTAs; keep buttons `radius.md`–`lg`.

---

## 5. Color & themes

### 5.1 Semantic color roles

| Role | Meaning |
|------|---------|
| `color.bg` | App background |
| `color.surface` | Cards, nav |
| `color.surface.container` | Nested wells |
| `color.fg` | Primary text |
| `color.fg.muted` | Secondary text |
| `color.border` | Dividers, input rings |
| `color.primary` | Brand actions |
| `color.primary.fg` | On-primary text |
| `color.primary.container` | Soft selected |
| `color.danger` / `warning` / `success` / `info` | Status |
| `color.overlay` | Scrim 40–50% |

### 5.2 Light theme

| Role | Value (guidance) |
|------|------------------|
| bg | `#F8F6F4` |
| surface | `#FFFFFF` |
| fg | `#1A1410` |
| muted | `#6B5F56` |
| border | `#EBE4E0` |
| primary | `#FF6B35` |
| primary container | `#FFF1EB` |
| hero / mesh | primary → `#D94E1F` |

### 5.3 Dark theme

| Role | Value (guidance) |
|------|------------------|
| bg | `#120E0C` |
| surface | `#1A1512` |
| surface container | `#2A1F1A` |
| fg | `#FDF6F0` |
| muted | `#A89890` |
| border | `#2E241F` |
| primary | `#FF8A5C` |
| on-primary | `#120E0C` |
| primary container | `#2A1810` |

**Rules**

- Prefer **tonal elevation** (lighter surface steps) over drop shadows in dark.  
- Desaturate primary slightly for large fills; keep CTA chips vivid.  
- Status colors tuned for contrast on dark surfaces.  
- Images: optional scrim for text overlays.  
- Default appearance: **System**; user override in Settings.

### 5.4 Status & sport accents

Status pills use semantic colors.  
Sport accents (badminton, cricket, …) live in a **sport palette**—decorative only, never sole meaning carrier.

---

## 6. Elevation & effects

| Level | Light | Dark |
|-------|-------|------|
| 0 | Flat on bg | Flat |
| 1 | Border subtle | Border + container |
| 2 | Soft shadow `0 4 24 rgba(0,0,0,.06)` | Tonal step up |
| 3 | Brand-tinted shadow optional for primary FAB | Tonal + border |

**Glass (web consumer nav):** translucent surface + blur; ensure solid fallback when `prefers-reduced-transparency`.

---

## 7. Buttons

### 7.1 Variants

| Variant | Use |
|---------|-----|
| **Filled (Primary)** | Main CTA: Book, Pay, Join, Save |
| **Tonal** | Secondary emphasis on brand soft fill |
| **Outlined** | Secondary: Cancel alternate, filters |
| **Text** | Tertiary: “See all”, inline |
| **Danger** | Destructive filled/outline |
| **Elevated** | Optional shopping/checkout (use sparingly) |

### 7.2 Sizes

| Size | Height | Type | Padding X |
|------|-------:|------|-----------|
| `sm` | 36 | label.md | 12 |
| `md` | 44 | label.lg | 16 |
| `lg` | 52 | label.lg | 20 |

Mobile minimum **44×44** touch target (padding may extend hit area).

### 7.3 States

Default · Hover (web) · Pressed · Focus-visible · Disabled · Loading (spinner replaces label or trailing).

### 7.4 Icon buttons

Square/circle; tooltip on web; `accessibilityLabel` required on mobile.  
Badge slot for cart/notifications.

### 7.5 Button groups

Primary right on dialogs (LTR); destructive never adjacent without confirmation.

---

## 8. Cards

### 8.1 Anatomy

```
[Media optional]
[Overline / chips]
[Title]
[Supporting text]
[Meta row]
[Actions optional]
```

### 8.2 Variants

| Variant | Use |
|---------|-----|
| **Elevated / bordered surface** | Venue, event, product rails |
| **Outlined** | Lists in forms |
| **Filled container** | Soft promo / membership offer |
| **Interactive** | Entire card pressable; hover lift web (2–4px) |
| **Stat** | Dashboard KPIs |
| **Feed** | Community activity |

### 8.3 Rules

- Hero consumer pages: **no card soup**—prefer open sections; cards for **interactive** entities.  
- Radius `lg`; padding `space.4+`.  
- Image 16:9 or 4:3; fixed height in rails for rhythm.  
- Skeleton shimmer matches card shape.

---

## 9. Forms

### 9.1 Fields

Text · Textarea · Select · Combobox (city) · Checkbox · Radio · Switch · Stepper · Date/Time · OTP · File/upload.

### 9.2 Field anatomy

Label (top) · Input · Helper · Error (replaces helper).  
Optional: leading/trailing icons, prefix ₹.

### 9.3 Input specs

- Height `md` 44–48 consumer; compact 36 ops.  
- Border `color.border`; focus ring `primary` @ 2px + soft glow.  
- Error: danger border + message linked via `aria-describedby`.  

### 9.4 Validation

- Inline on blur for format; on submit for required.  
- Don’t block typing with aggressive live errors.  
- Success checkmarks only when helpful (e.g. username available).

### 9.5 Form layout

Single column mobile; two-column desktop for address blocks.  
Primary submit sticky on long mobile forms when needed.

---

## 10. Dialogs

### 10.1 Types

| Type | Use |
|------|-----|
| **Modal dialog** | Confirmations, short forms |
| **Alert** | Destructive confirm |
| **Fullscreen (mobile)** | Complex flows (rare; prefer sheets) |

### 10.2 Anatomy

Scrim · Container · Title · Body · Actions (Cancel + Confirm).  
Focus trap; ESC closes; restore focus on close.

### 10.3 Sizes (web)

`sm` 360 · `md` 480 · `lg` 640.  
Mobile: nearly full width with `space.4` margin or convert to sheet.

---

## 11. Bottom sheets

### 11.1 Role

**Primary mobile pattern** for filters, city/sport pickers, slot confirm, share, create open match.

### 11.2 Types

| Type | Behavior |
|------|----------|
| **Modal sheet** | Scrim, must dismiss explicitly |
| **Detent sheet** | Peek / half / full (map, filters) |
| **Action sheet** | Short list of actions |

### 11.3 Anatomy

Handle · Title · Content · Sticky footer CTA (optional).  
Swipe down to dismiss when safe; respect scroll locking.

### 11.4 Web equivalent

Modal dialog or right drawer for ops filters—not a fake mobile sheet on desktop.

---

## 12. Navigation

### 12.1 Patterns

| Pattern | Surface |
|---------|---------|
| **Bottom navigation (5)** | Mobile consumer |
| **Top app bar** | Mobile stacks |
| **Header + links** | Consumer web |
| **Sidebar + top bar** | Venue OS, Command, Coach Desk |
| **Tabs / segmented** | Play (Book/My Games), Store |
| **Breadcrumbs** | Web entity & admin |

### 12.2 Bottom nav specs

- 5 destinations max (Home, Explore, Play, Store, Profile).  
- Active: primary indicator pill + label.  
- Badges on icon.  
- Safe-area inset; surface container background.  
- Re-tap scrolls to top.

### 12.3 Sidebar (ops)

- Grouped labels (`label.sm` uppercase muted).  
- Active: primary container + primary text.  
- Collapsed icon mode ≥ tablet.

### 12.4 Portal top bar

Title + subtitle · Browse FitOra · Avatar—consistent across Control Rooms.

---

## 13. Icons

### 13.1 Library

**Lucide** (web/admin already) as default stroke set.  
Mobile: Lucide react-native or SF/Material equivalents mapped 1:1 by **semantic name**.

### 13.2 Specs

| Property | Value |
|----------|-------|
| Default size | 20 / 24 |
| Stroke | 1.75–2 |
| Grid | 24px optical |
| Color | `currentColor` |

### 13.3 Semantic catalog (examples)

`home` `explore` `play` `store` `profile` `bell` `cart` `map-pin` `calendar` `qr` `users` `trophy` `sparkles` (AI) `heart` `share` `settings` `chevron-*`

### 13.4 Rules

- Don’t mix filled+outline randomly; outline default, filled for selected tab if needed.  
- Sport-specific: prefer emoji **or** custom sport glyphs—pick one system per surface.  
- Always pair icon-only controls with labels for a11y.

---

## 14. Illustrations

### 14.1 Style

- Warm, flat-with-light-depth, athletic silhouettes.  
- Orange accent shapes; avoid purple AI clichés.  
- Inclusive body types; India-context sports (badminton, cricket, football…).  
- Empty states: optimistic, short caption + CTA.

### 14.2 Types

| Type | Use |
|------|-----|
| Empty state | No bookings, empty cart, no friends |
| Spot | Onboarding, success |
| Hero art | Marketing web only |
| Achievement | Badge art (simple shapes) |

### 14.3 Formats

SVG preferred; Lottie for select celebrations (opt-in motion).  
Dark mode: dedicated dark variants or CSS-friendly SVGs.

---

## 15. Animations

### 15.1 Motion tokens

| Token | Duration | Easing |
|-------|----------|--------|
| `fast` | 120–160ms | standard |
| `normal` | 200–250ms | emphasized |
| `enter` | 300–400ms | decelerate |
| `exit` | 150–200ms | accelerate |

### 15.2 Patterns

| Pattern | Use |
|---------|-----|
| Fade + rise | Feed/rails enter |
| Shared axis | Tab switches |
| Container transform | Card → detail (P2) |
| Sheet spring | Bottom sheets |
| Skeleton shimmer | Loading |
| Success check | Payment / check-in (short) |

### 15.3 Rules

- **Purposeful only**—no endless float on ops screens.  
- Honor `prefers-reduced-motion`: replace with opacity cuts / instant.  
- Celebration (confetti) once, &lt;1.5s, disable if reduced motion.  
- List reorder: subtle; never block input.

---

## 16. Accessibility

### 16.1 Requirements

| Area | Standard |
|------|----------|
| Contrast | WCAG 2.2 AA minimum for text/UI |
| Focus | Visible focus ring (primary) on all interactive |
| Targets | ≥44×44 CSS px / dp |
| Keyboard | Full web flows without mouse |
| Screen readers | Labels, traits, live regions for toasts/errors |
| Forms | Labelled inputs; errors announced |
| Motion | Reduced-motion paths |
| Localization | Layouts OK for +40% text length |

### 16.2 Patterns

- Don’t use color alone for status—pair with text/icon.  
- Map pins: not color-only.  
- Modals/sheets: focus trap + return focus.  
- Toasts: `role="status"`; errors `role="alert"`.  
- Skip link on web consumer.  

### 16.3 Testing checklist

Keyboard pass · VoiceOver/TalkBack spot checks · axe/lighthouse · Zoom 200% · Dark contrast audit.

---

## 17. Component library

### 17.1 Package strategy

| Package / area | Contents |
|----------------|----------|
| `@fitora/ui` (web) | Primitives: Button, Input, Card, Badge, Dialog, Tabs, Avatar, Skeleton… |
| Mobile `components/ui` | Parallel primitives on RN |
| App-level composites | VenueCard, MatchCard, InsightCard, PortalTopBar |
| Ops | DataTable, PageHeader, FilterBar, Calendar (Venue OS) |

**Rule:** Apps consume tokens + primitives; feature cards live in apps but follow recipes.

### 17.2 Primitive inventory

**Actions:** Button, IconButton, Link, FAB (Play create sparingly)  
**Inputs:** TextField, TextArea, Select, Combobox, Checkbox, Radio, Switch, Slider, SearchField  
**Display:** Text, Heading, Avatar, Badge/Pill, Chip, Divider, Spinner, Skeleton, Progress  
**Containers:** Surface, Card, List, ListItem, Accordion  
**Overlay:** Dialog, AlertDialog, BottomSheet, Drawer, Tooltip, Popover, DropdownMenu  
**Nav:** BottomNav, Tabs, TopAppBar, Breadcrumb, Sidebar, Pagination  
**Feedback:** Toast/Snackbar, Banner, EmptyState, ErrorState  
**Data (ops):** Table, Stat, Chart wrappers  

### 17.3 Composite inventory (product)

VenueCard · EventCard · ProgramCard · ProductCard · ServiceCard · OpenMatchRow · FeedPost · FriendActivity · MembershipOffer · InsightCard · RecommendationCard · CheckInPanel · QRDisplay · SportChip · CitySelect · UserMenu · NotificationBell · PortalTopBar · CommandPalette (admin)

### 17.4 Documentation standards (Storybook / catalog)

Each component page: Purpose · Anatomy · Variants · Sizes · States · A11y · Do/Don’t · Tokens used · Code snippet (when implemented).

### 17.5 Versioning

Semantic versioning for `@fitora/ui`.  
Breaking token renames → major; new variants → minor.

---

## 18. Content & voice (UI copy)

- Short, active, sporty: “Book court”, “Join match”, “Invite friends”.  
- Errors: blame-free + next step.  
- Empty: invite action, not guilt.  
- AI reasons: human chips (“Near you”), not model jargon.

---

## 19. Do / Don’t

| Do | Don’t |
|----|-------|
| Use primary orange for primary CTAs | Rainbow accents on every chip |
| Warm neutrals | Cold gray enterprise chrome |
| Cards for interactive entities | Card wrappers on every paragraph |
| Bottom sheets on mobile filters | Tiny desktop modals on phones |
| Reduced-motion paths | Infinite decorative loops |
| Shared button sizes | One-off padding per screen |

---

## 20. Governance

| Role | Responsibility |
|------|----------------|
| Design lead | Token & Figma library |
| FE lead | `@fitora/ui` + RN parity |
| QA | A11y + visual regression |
| Product | Approves new composites |

**Change process:** RFC in PR → update this doc → Figma → code.

---

## 21. Delivery roadmap

### Phase 1 — Tokens + primitives

Color (light/dark) · type · space · Button · Input · Card · Badge · Dialog/Sheet · Tabs · Skeleton

### Phase 2 — Consumer composites

Venue/Event/Product/Match cards · Empty states · Nav patterns · CitySelect

### Phase 3 — Ops density

DataTable · PageHeader · Calendar chrome · Compact density theme

### Phase 4 — Motion + illustration pack

Lottie subset · Achievement art · Shared-element pilots  

---

## 22. Document control

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-07-13 | Complete Orbit UI design system |

**Out of scope:** Implementation PRs, Figma file binary.  
**Next:** Figma Orbit UI kit · `@fitora/ui` audit against this spec · RN theme alignment.
