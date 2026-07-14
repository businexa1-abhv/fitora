## Brand & Style
The design system is engineered for a high-energy, premium sports marketplace. It bridges the gap between professional athletic performance and community accessibility. The visual language is rooted in **Modern Corporate** aesthetics with a **Tactile** edge, utilizing the Material Design 3 (MD3) logic of tonal relationships.

The emotional response should be one of "Ready-to-Play"—invigorating, reliable, and premium. We avoid the clinical feel of traditional SaaS by using warm neutrals and vibrant, citrus-based primaries that reflect the intensity of Indian sports culture. Whitespace is used strategically to maintain a premium feel, ensuring that dense marketplace data remains digestible for parents and athletes alike.

## Layout & Spacing
The design system follows an **8px grid system** for consistent spatial rhythm, with a 4px increment for micro-adjustments.

- **Mobile:** 4-column grid with 16px margins and 16px gutters.
- **Tablet:** 8-column grid with 24px margins.
- **Desktop:** 12-column fluid grid, max-width 1440px, with 64px margins.

Layouts should prioritize vertical scanning. Use "Primary Container" (#FFF1EB) as full-bleed section backgrounds to break up long scrolling pages without using harsh dividers.

## Elevation & Depth
In alignment with MD3, this design system minimizes heavy drop shadows. Depth is communicated via **Tonal Elevation**:

1.  **Level 0 (Surface):** Default background (#FFFBFA).
2.  **Level 1 (Tonal Offset):** Cards and containers use a subtle tint or a very soft 2% opacity shadow to appear slightly lifted.
3.  **Level 2 (Interaction):** Active cards or hovered elements use a more pronounced primary-tinted shadow (e.g., `0px 4px 12px rgba(255, 107, 53, 0.08)`).
4.  **Floating Action Buttons (FAB):** The only elements permitted to have high-contrast shadows to ensure they remain the primary call-to-action in the marketplace.

## Components
Consistent implementation of components ensures the marketplace feels reliable.

- **Buttons:**
    - *Primary:* Filled with #FF6B35, white text.
    - *Secondary:* Tonal (Primary Container background with #E55520 text).
    - *Tertiary:* Ghost style with #FF6B35 text.
- **Cards:** Large 12px rounded containers. Use "Surface-Variant" for borders (1px) instead of shadows for a cleaner, modern look.
- **Status Chips (24px Pill):**
    - *Available:* Green (#22C55E) background, 10% opacity, with solid green text.
    - *Booked:* Grey (#85736E) background, 10% opacity, with solid grey text.
    - *Selected:* Orange (#FF6B35) solid background, white text.
- **Input Fields:** Outlined style using "Outline" color. On focus, the border thickens to 2px and changes to FitOra Orange.
- **Navigation:** Use MD3 Bottom Navigation for mobile, featuring a pill-shaped active state indicator around icons.
- **Icons:** Material Symbols Rounded, 2px stroke weight.