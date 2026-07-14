# FitOra Mobile — Design System

> Version 1.0 · July 2026
> Audience: Product Designers, UX Engineers, React Native Engineers

---

## Philosophy

FitOra's design system is built on four pillars:

| Pillar | Expression |
|--------|-----------|
| **Premium** | Generous whitespace, refined typography, tasteful depth |
| **Energetic** | Warm orange accent, bold imagery, confident scale |
| **Friendly** | Rounded corners, soft shadows, approachable tone |
| **Inclusive** | WCAG 2.1 AA contrast, dynamic type, accessible gestures |

The system draws inspiration from:
- **Nike Training Club** — motivational hierarchy, full-bleed imagery
- **Airbnb** — card-based discovery, trustworthy information density
- **Apple Fitness** — ring animations, celebration moments, dark mode excellence
- **Google Material 3** — dynamic color, expressive motion, accessible elevation

---

## Brand Colors

### Primary Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary-500` | `#F97316` | CTAs, active states, brand moments |
| `primary-400` | `#FB923C` | Hover / pressed states |
| `primary-600` | `#EA6C10` | Deep pressed, focus rings |
| `primary-100` | `#FFEDD5` | Tinted backgrounds, chips |
| `primary-50` | `#FFF7ED` | Subtle surface tints |

### Secondary Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `secondary-900` | `#111827` | Primary text, headers |
| `secondary-800` | `#1F2937` | Secondary text |
| `secondary-700` | `#374151` | Tertiary text, icons |
| `secondary-500` | `#6B7280` | Placeholder, muted |
| `secondary-200` | `#E5E7EB` | Dividers, borders |
| `secondary-100` | `#F3F4F6` | Subtle backgrounds |

### Accent Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `accent-500` | `#22C55E` | Success, availability, open now |
| `accent-400` | `#4ADE80` | Light success |
| `accent-100` | `#DCFCE7` | Success tint backgrounds |

### Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `error-500` | `#EF4444` | Errors, destructive actions |
| `error-100` | `#FEE2E2` | Error backgrounds |
| `warning-500` | `#F59E0B` | Warnings, pending states |
| `warning-100` | `#FEF3C7` | Warning backgrounds |
| `info-500` | `#3B82F6` | Informational, links |
| `info-100` | `#DBEAFE` | Info backgrounds |

### Background & Surface

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-base` | `#F8FAFC` | App background |
| `bg-surface` | `#FFFFFF` | Cards, sheets, inputs |
| `bg-elevated` | `#FFFFFF` | Elevated cards (with shadow) |
| `bg-sunken` | `#F1F5F9` | Input backgrounds, inactive tabs |

---

## Dark Mode Palette

| Token | Dark Hex | Maps From |
|-------|----------|-----------|
| `bg-base` | `#0A0F1E` | `#F8FAFC` |
| `bg-surface` | `#131929` | `#FFFFFF` |
| `bg-elevated` | `#1C2438` | `#FFFFFF` |
| `bg-sunken` | `#0D1220` | `#F1F5F9` |
| `secondary-900` | `#F9FAFB` | Text inversion |
| `secondary-700` | `#D1D5DB` | Secondary text |
| `secondary-500` | `#9CA3AF` | Muted text |
| `secondary-200` | `#374151` | Dividers |
| Glass tint | `rgba(255,255,255,0.06)` | Glass cards |

The primary orange `#F97316` remains unchanged in dark mode — it is self-luminous enough.

---

## Typography

### Font Family

- **Display / Headings**: `Inter` (weights: 400, 500, 600, 700, 800)
- **Body**: `Inter` (weights: 400, 500)
- **Monospace / Numbers**: `Inter` with `fontVariant: ['tabular-nums']`

Fallback stack: `-apple-system, "Helvetica Neue", sans-serif`

### Type Scale

| Name | Size | Line Height | Weight | Letter Spacing | Usage |
|------|------|-------------|--------|----------------|-------|
| `display-xl` | 36px | 44px | 800 | -0.5px | Hero headlines |
| `display-lg` | 30px | 38px | 700 | -0.3px | Section heroes |
| `display-md` | 24px | 32px | 700 | -0.2px | Screen titles |
| `title-lg` | 20px | 28px | 600 | -0.1px | Card titles, section headers |
| `title-md` | 18px | 26px | 600 | 0px | Sub-section headers |
| `title-sm` | 16px | 24px | 600 | 0px | List item titles |
| `body-lg` | 16px | 24px | 400 | 0px | Primary body copy |
| `body-md` | 14px | 22px | 400 | 0px | Secondary body, descriptions |
| `body-sm` | 12px | 18px | 400 | 0.1px | Captions, meta |
| `label-lg` | 14px | 20px | 600 | 0.1px | Button labels, strong UI |
| `label-md` | 12px | 16px | 600 | 0.5px | Tags, chips, badges |
| `label-sm` | 10px | 14px | 600 | 0.8px | Micro labels |

### Typography Rules

- Never go below 12px for readable text
- Use `lineBreakStrategyIOS: 'hangul-word'` equivalent for better wrapping
- Apply optical sizing — display text scales up by 2px on large screens
- Maximum line length: 72 characters for body text

---

## Spacing System

Based on an 8px base unit with a 4px micro unit.

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Micro gaps, icon padding |
| `space-2` | 8px | Tight spacing, inline elements |
| `space-3` | 12px | Default inner padding (small) |
| `space-4` | 16px | Default spacing unit |
| `space-5` | 20px | Section inner padding |
| `space-6` | 24px | Card padding, section gaps |
| `space-8` | 32px | Large section separators |
| `space-10` | 40px | Screen top padding |
| `space-12` | 48px | Hero bottom padding |
| `space-16` | 64px | Section vertical rhythm |
| `space-20` | 80px | Large hero sections |

### Layout Grid

- **Screen horizontal padding**: 20px (`space-5`)
- **Card gap**: 12px (`space-3`)
- **Section gap**: 32px (`space-8`)
- **Bottom nav clearance**: 90px

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-xs` | 4px | Tags, micro chips |
| `radius-sm` | 8px | Buttons, inputs |
| `radius-md` | 12px | Small cards |
| `radius-lg` | 16px | Standard cards |
| `radius-xl` | 20px | Large cards, hero sections |
| `radius-2xl` | 24px | Bottom sheets, modal cards |
| `radius-3xl` | 32px | Hero cards, feature cards |
| `radius-full` | 9999px | Pills, avatars, FAB |

---

## Elevation & Shadows

FitOra uses a 5-level shadow scale. Shadows use the brand color `#F97316` at very low opacity for a warm, on-brand glow on elevated cards.

### Light Mode

| Level | Shadow | Usage |
|-------|--------|-------|
| `elevation-0` | none | Flat elements, backgrounds |
| `elevation-1` | `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` | Subtle lift (chips, tags) |
| `elevation-2` | `0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05)` | Standard cards |
| `elevation-3` | `0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.05)` | Floating cards, FAB |
| `elevation-4` | `0 20px 25px rgba(0,0,0,0.10), 0 8px 10px rgba(0,0,0,0.06)` | Bottom sheets, modals |

### Dark Mode

All shadows lighten to use `rgba(0,0,0,0.3–0.5)` with no color tint.

### Brand Glow (Primary Cards)

Featured cards and CTAs may use:
```
0 8px 24px rgba(249,115,22,0.20), 0 2px 6px rgba(249,115,22,0.12)
```

---

## Iconography

### Icon Set

Primary: **Phosphor Icons** (Regular + Bold weights)
Supplementary: Custom sport-specific icons (SVG)

### Icon Sizes

| Token | Size | Usage |
|-------|------|-------|
| `icon-xs` | 16px | Inline body icons |
| `icon-sm` | 20px | List icons, meta icons |
| `icon-md` | 24px | Navigation, actions |
| `icon-lg` | 28px | Feature icons |
| `icon-xl` | 32px | Card icons |
| `icon-2xl` | 48px | Empty states |
| `icon-3xl` | 64px | Onboarding, hero icons |

### Navigation Icons (Active/Inactive)

| Tab | Inactive Icon | Active Icon |
|-----|--------------|-------------|
| Home | `house` (regular) | `house-fill` |
| Explore | `compass` (regular) | `compass-fill` |
| Play | `soccer-ball` (regular) | `soccer-ball-fill` |
| Store | `storefront` (regular) | `storefront-fill` |
| Profile | `user-circle` (regular) | `user-circle-fill` |

---

## Imagery Guidelines

### Photography Style

- **Action shots**: Dynamic sports photography, motion blur acceptable
- **Venue photos**: Architectural quality, well-lit courts/fields
- **Player photos**: Authentic, diverse representation
- **Color grading**: Slightly warm, high contrast, punchy

### Image Treatments

- **Hero images**: Full-bleed with gradient overlay `linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.7) 100%)`
- **Card thumbnails**: 16:9 or 4:3 ratio, `cover` object-fit
- **Circular avatars**: Always with 2px `#FFFFFF` border ring in dark backgrounds
- **Skeleton**: Animated gradient shimmer during load

### Aspect Ratios

| Usage | Ratio |
|-------|-------|
| Hero banner | 16:9 or 21:9 |
| Venue card | 16:9 |
| Coach card | 3:4 (portrait) |
| Sport category | 1:1 |
| Story-style card | 9:16 |
| Product card | 4:3 |

---

## Glass Morphism

Used sparingly for overlays, notification badges on images, and floating pills.

### Glass Card Spec

```
Background: rgba(255, 255, 255, 0.10)
Backdrop blur: 20px
Border: 1px solid rgba(255, 255, 255, 0.18)
Border radius: radius-xl (20px)
```

### Dark Glass Spec

```
Background: rgba(0, 0, 0, 0.30)
Backdrop blur: 20px
Border: 1px solid rgba(255, 255, 255, 0.10)
```

**When to use:**
- Price overlays on venue hero images
- Rating badges floating on card images
- "Open Now" status pill on map markers
- Notification count badges

**When NOT to use:**
- Primary content containers
- Navigation bars (use solid colors)
- Input fields

---

## States

### Interactive States

| State | Treatment |
|-------|-----------|
| Default | As designed |
| Hovered | Scale `1.02`, slight shadow increase |
| Pressed | Scale `0.97`, opacity `0.90` |
| Focused | `2px` ring `primary-500` with `4px` offset |
| Disabled | Opacity `0.40`, no interactive feedback |
| Loading | Skeleton pulse or spinner (brand orange) |
| Error | `error-500` border, error message below |
| Success | `accent-500` border, checkmark animation |

### Empty States

Every list/feed screen must have a designed empty state:

- Centered illustration (Lottie or static SVG)
- Short headline (max 4 words)
- Supportive body copy (1–2 lines)
- Primary CTA button
- Illustration should be sports-themed and on-brand

---

## Motion Principles

See `08-animation-guidelines.md` for full spec. Summary:

| Principle | Guideline |
|-----------|-----------|
| **Purposeful** | Every animation communicates state |
| **Snappy** | Short durations (150–400ms) |
| **Natural** | Spring physics, not linear easing |
| **Respectful** | Honor `reduceMotion` preference |

---

## Accessibility

### Contrast Requirements

| Text Type | Minimum Ratio | Target Ratio |
|-----------|--------------|--------------|
| Body text | 4.5:1 | 7:1 |
| Large text (≥18pt) | 3:1 | 4.5:1 |
| UI components | 3:1 | 4.5:1 |
| Decorative | — | — |

### Touch Targets

- Minimum: 44×44pt (Apple HIG) / 48×48dp (Material 3)
- Preferred: 56×56pt for primary actions
- Provide `hitSlop` extensions on small icons

### Semantic Labels

- All interactive elements must have `accessibilityLabel`
- Use `accessibilityHint` for non-obvious actions
- `accessibilityRole` must be set on all custom components
- Live regions for dynamic content (`accessibilityLiveRegion`)

### Focus Order

- Logical reading order (top → bottom, left → right)
- Skip navigation for long lists
- Trap focus inside modals and bottom sheets
