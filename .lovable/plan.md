

## Deep Audit: Auth Page Icon and Font Issues

### Root Cause Analysis

**Issue 1 & 3: Icons render as solid primary-colored rectangles**

The previous `<img>` fix was **never actually applied** to the current codebase. `Auth.tsx` lines 67-83 still use CSS `mask-image`:

```tsx
style={{
  backgroundColor: "hsl(var(--primary))",
  WebkitMaskImage: `url(${item.src})`,
  maskImage: `url(${item.src})`,
  ...
}}
```

This is a `<span>` with a solid `bg-primary` background, masked by the SVG URL. When the mask fails to resolve (service worker interception, PWA precache miss, iOS WebKit quirks, or any network hiccup), the mask is ignored and you see the raw `bg-primary` rectangle.

**Why icon-02 (icon09) works intermittently**: it's the simplest SVG of the set. Browser mask rendering is more lenient with simpler paths. But all 5 are fragile with this approach.

**Issue 2: Font flash (FOUT)**

The `@font-face` for `BringBoldNineties` in `index.css` line 5-10 has no `font-display` property. The browser default is `auto` (which on most browsers behaves like `block` — invisible text for up to 3 seconds, then fallback). The `.bountt-wordmark` class has `'Times New Roman'` as fallback, creating a visible style shift when the TTF finally loads.

---

### Permanent Fix Plan

#### 1. Rebuild icon system from scratch (Auth.tsx lines 64-84)

Replace the entire mask-based `<span>` approach with **inline SVG React components**. This eliminates all external URL resolution, caching, and mask-rendering issues.

**Approach:**
- Create `src/components/auth/FloatingIcons.tsx`
- Import each SVG as a React component (Vite supports `?react` suffix for SVG imports)
- Render each as an inline `<svg>` element with a hardcoded `fill="#003C69"` (primary color, baked in, no theming)
- Apply opacity and animation classes directly on the wrapping `<div>`
- Remove all `mask-image` code from Auth.tsx

**Why this is permanent:**
- Inline SVGs are part of the DOM — no external URL to resolve, no caching layer
- Hardcoded fill means no CSS variable dependency
- Works identically on web, PWA, iOS Safari, Android Chrome
- Cannot degrade to rectangles — there's no background element to "show through"

#### 2. Fix font flash (index.css)

Add `font-display: swap` to the `@font-face` declaration:

```css
@font-face {
  font-family: 'BringBoldNineties';
  src: url('@/assets/fonts/Bringbold_Nineties_Regular.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
```

This shows the fallback font immediately, then swaps to BringBold once loaded — no invisible text period.

#### 3. Update Auth.tsx

- Remove all `icon-*.svg` string imports (lines 7-11)
- Import the new `<FloatingIcons />` component
- Replace the mask-based icon block (lines 64-84) with `<FloatingIcons />`
- Keep the exact same positioning classes (`left-[15%] bottom-[18%]` etc.) and animation classes (`auth-float-1` etc.)

#### 4. No changes to these files
- `src/index.css` animation keyframes — kept as-is
- `src/pages/Splash.tsx` — not touched
- No CSS variable / color token changes

### Files changed

| File | Action |
|---|---|
| `src/components/auth/FloatingIcons.tsx` | Create — 5 inline SVG icons with hardcoded fill, positioned identically to current layout |
| `src/pages/Auth.tsx` | Edit — replace mask block with `<FloatingIcons />`, remove SVG string imports |
| `src/index.css` | Edit — add `font-display: swap` to `@font-face` (line 9) |

