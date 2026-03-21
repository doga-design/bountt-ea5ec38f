

## Fix: Auth page icons showing as colored rectangles

### Problem
The floating icons on the Auth page use a CSS `mask-image` technique — a `bg-primary` div is masked by the SVG URL so only the icon shape shows through. When the mask image fails to load (service worker interception, caching, or browser rendering quirk), the entire div renders as a solid primary-colored rectangle.

### Solution
Replace the fragile CSS mask approach with direct `<img>` tags. To keep the primary color tinting, apply a CSS `filter` that shifts black SVGs to the primary color, or simply render the icons in their native black at reduced opacity (which fits the subtle floating aesthetic).

### Changes

**File: `src/pages/Auth.tsx`** (lines 68–84)

Replace the mask-based div with a straightforward `<img>` element:

```tsx
{FLOAT_ICONS.map((item) => (
  <div key={item.src} className={`absolute ${item.className}`}>
    <img
      src={item.src}
      alt=""
      draggable={false}
      className={`h-full w-full object-contain opacity-[0.88] ${item.anim}`}
      style={{
        filter:
          "brightness(0) saturate(100%) invert(14%) sepia(72%) saturate(2848%) hue-rotate(192deg) brightness(94%) contrast(107%)",
      }}
    />
  </div>
))}
```

The CSS `filter` chain converts the black SVG paths to the primary brand color (#003C69). This is more reliable than `mask-image` and works consistently across all browsers.

### Why this is better
- `<img>` tags are natively supported and don't depend on mask rendering
- No service worker or caching issues with mask-image URL resolution
- CSS filter color tinting is well-supported and predictable
- Animations and layout stay exactly the same

### Notes
- The filter values target #003C69 (the project's primary color). If the primary color changes, the filter string would need recalculating.
- An alternative: skip color tinting entirely and use `opacity-[0.15]` on the raw black SVGs for a subtle watermark effect — simpler and theme-proof.

