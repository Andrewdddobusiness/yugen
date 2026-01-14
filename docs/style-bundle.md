# Yugi Design Bundle (Web + Mobile + Gemini)

Use this as the single source of truth across web, mobile, and AI-generated screens. Fonts and tokens match the live app (Nunito body, Londrina Solid for brand headings, Londrina Sketch reserved for rare highlights; brand colors already in `tailwind.config.ts` and `globals.css`).

---

## 1) Tailwind (Web – Next.js)

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 700: "#2A3B63", 600: "#334A7A", 500: "#3F5FA3", 400: "#5C7BCB", 300: "#8FA8E6" },
        bg: { 0: "#FFFFFF", 50: "#F7F8FB", 100: "#EEF1F7" },
        ink: { 900: "#0D1321", 700: "#2A3245", 500: "#55607A" },
        stroke: { 200: "#DDE3F0" },
        tan: { 500: "#8A5A3C", 200: "#E6C9B7" },
        accent: { teal: "#22B8B2", coral: "#FF5A6B", lime: "#40D57C", amber: "#FFB020" },
        glass: { light: "rgba(255,255,255,0.72)", dark: "rgba(13,19,33,0.55)" },
      },
      borderRadius: { xl: "16px", lg: "14px", md: "12px", pill: "999px" },
      boxShadow: {
        card: "0 8px 24px rgba(13,19,33,0.10)",
        float: "0 16px 40px rgba(13,19,33,0.16)",
        pressable: "0 6px 0 rgba(42,59,99,0.25), 0 10px 24px rgba(13,19,33,0.10)",
        pressed: "0 2px 0 rgba(42,59,99,0.20), 0 6px 16px rgba(13,19,33,0.08)",
      },
      backdropBlur: { glass: "16px" },
      fontFamily: {
        sans: ["var(--font-nunito)", "Nunito", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        logo: ["var(--font-londrina-solid)", "Londrina Solid", "cursive"],
        sketch: ["var(--font-londrina-sketch)", "Londrina Sketch", "cursive"],
      },
    },
  },
  plugins: [],
};

export default config;
```

**Utilities**
- Glass: `bg-glass-light backdrop-blur-glass border border-stroke-200/60 shadow-float dark:bg-glass-dark dark:border-white/10`
- Pressable button: `shadow-pressable active:translate-y-[2px] active:shadow-pressed`
- Logo font: `font-logo`; Body font defaults to Nunito from `globals.css`

---

## 2) NativeWind Tokens (Mobile – Expo)

```ts
export const tokens = {
  color: {
    brand: { 700: "#2A3B63", 600: "#334A7A", 500: "#3F5FA3", 400: "#5C7BCB", 300: "#8FA8E6" },
    bg: { 0: "#FFFFFF", 50: "#F7F8FB", 100: "#EEF1F7" },
    ink: { 900: "#0D1321", 700: "#2A3245", 500: "#55607A" },
    stroke: "#DDE3F0",
    accent: { teal: "#22B8B2", coral: "#FF5A6B", lime: "#40D57C", amber: "#FFB020" },
  },
  radius: { xl: 16, lg: 14, md: 12, pill: 999 },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  shadow: {
    card: "0 8px 24px rgba(13,19,33,0.10)",
    float: "0 16px 40px rgba(13,19,33,0.16)",
    pressable: "0 6px 0 rgba(42,59,99,0.25), 0 10px 24px rgba(13,19,33,0.10)",
    pressed: "0 2px 0 rgba(42,59,99,0.20), 0 6px 16px rgba(13,19,33,0.08)",
  },
};
```

**Glass (mobile)**: `BlurView` with intensity 30, tint light, `rounded-xl border border-white/30`. Fallback: `bg-white/80 border border-stroke`.

---

## 3) Component Recipes (Design + Behavior)

- **Primary Button (tactile)**: h-11 px-5, radius 14, `bg-brand-500 text-white shadow-pressable active:translate-y-[2px] active:shadow-pressed`.
- **Secondary Glass Button**: Glass surface, subtle border, no heavy shadow; use for filters/secondary actions.
- **Activity Card**: Solid surface (`bg-0`), border `stroke-200`, radius 16, optional 6px left accent bar, title + meta row (time, distance), backup options as nested tinted cards.
- **Calendar Block**: Tint fill 10–16%, selected = border `brand-500` + glow; avoid solid fills.
- **Floating Panel/Sheet**: Glass container, rounded XL, slide + fade transition; inner content uses solid cards.
- **Toast / Inline feedback**: Compact, may include small wolf head (28–32px), non-blocking.
- **Empty State**: Wolf mascot (120–160px), one-line guidance, single primary CTA.
- **Loading Overlay**: Use `/assets/yugi-mascot-1.png` with gentle float and glass card (see `components/loading/LoadingOverlay.tsx`).

---

## 4) Gemini Master Prompt

> You design premium travel-planning UI. Follow this system:
> - Theme: Soft Navigator Glass; personality: calm, precise, quietly playful.
> - Colors: brand slate blues (`brand.500` primary), bg neutrals, ink text; accents teal/coral sparingly.
> - Typography: Nunito for body/UI, Londrina Solid for brand headings (`font-logo`). Use sketch font only for rare playful highlights.
> - Buttons are tactile (press depth/shadow), not flat.
> - Glass only for floating overlays/panels; primary reading surfaces are solid.
> - Mascot (friendly wolf) appears only in onboarding, empty states, success, warnings, loading - never in dense editors.
> - Interaction: clear primary action, soft purposeful transitions.
> Output must describe layout, component types, and reference tokens (brand.500, bg.50, ink.900, etc.). Do not invent new visual systems.

---

### Notes
- Homepage visuals stay as-is; apply these rules to new/inner flows.
- Keep alternates/backups in scheduling flows, emphasize calendar-first planning, collaboration, and export/mobile navigation.
