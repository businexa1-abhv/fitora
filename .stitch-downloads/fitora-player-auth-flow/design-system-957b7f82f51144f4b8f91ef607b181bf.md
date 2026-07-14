## Brand & Style
The design system for this product is built on the principles of **Google Material Design 3**, modified with a premium, high-energy sports aesthetic. It targets a fitness-conscious community, blending professional performance tracking with social connectivity. The visual narrative balances the "human" aspect of community with the "precision" of athletic data.

The style is characterized by **Modern Minimalist Athletics**: high-clarity layouts, expansive whitespace, and large, interactive surfaces. It avoids unnecessary clutter, allowing vibrant action photography and performance metrics to lead the experience. The emotional response is intended to be motivating, optimistic, and highly accessible, ensuring that users of all fitness levels feel welcome and empowered.

## Layout & Spacing
This design system employs a **Fluid Grid** model based on an 8px base unit (4px for micro-adjustments). Layouts are constructed using a 4-column structure for mobile and a 12-column structure for desktop.

Spacing follows a "rhythmic stack" philosophy where related fitness metrics are grouped with 8px gaps, while distinct content sections are separated by 48px to allow the UI to breathe. Safe margins are strictly enforced at 16px on mobile to ensure touch targets remain clear of the screen edges. Cards and containers use internal padding of 20px or 24px to emphasize the "premium" feel through generous negative space.

## Elevation & Depth
In alignment with Material Design 3, elevation is primarily expressed through **Tonal Layers** rather than heavy shadows. Different levels of depth are created by shifting the background color of surfaces.

- **Level 0 (Base):** #F8FAFC (Standard background).
- **Level 1 (Cards):** Surface color with a subtle 1px border (#CBD5E1) or a very soft, high-diffusion ambient shadow (0px 2px 8px, 4% opacity).
- **Level 2 (Active/Modals):** Tonal shift to #FFFFFF (or deeper slates in dark mode) with a distinct secondary shadow to indicate interaction capability.

The use of "Ghost Borders" (low-contrast outlines) is preferred for card-based layouts to keep the interface looking modern and crisp without the visual weight of traditional skeuomorphic shadows.

## Components
Consistent component behavior is vital for a performance-driven app:

- **Buttons:** Primary CTAs use the #F97316 background with white text and `rounded-md`. Text is uppercase `label-lg` to evoke a "jersey" or "stadium" feel.
- **Cards:** Large-format cards with 24px corner radius. They should feature subtle internal gradients or background images with a 40% black overlay to ensure typography remains accessible.
- **Chips:** Used for "Sport Types" (e.g., # Running, # Yoga). These are pill-shaped with #F1F5F9 backgrounds and 12px `label-md` text.
- **Input Fields:** Outlined style with 8px corner radius. Focused state transitions the border to Primary Orange with a 2px stroke width.
- **Progress Rings:** Use #22C55E (Green) for completion. Rings should have rounded caps to match the overall shape language.
- **Lists:** High-density list items for workout logs should use 16px vertical padding and a bottom-border separator of #F1F5F9 for clean scanning.