

# Remove All Scrollbars Globally

## Problem

Scrollbars are still visible because:
- `scrollbarWidth: 'none'` only works in Firefox
- `msOverflowStyle: 'none'` only works in IE/Edge legacy
- **WebKit browsers (Chrome, Safari -- the ones your users actually use) require `::-webkit-scrollbar { display: none }` which cannot be set via inline styles**

## Solution

### 1. Add a global CSS rule in `src/index.css`

Add a universal scrollbar-hiding rule that applies to ALL scrollable elements across the entire app:

```css
/* Hide all scrollbars globally - mobile app */
*::-webkit-scrollbar {
  display: none;
}
* {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
```

This single rule eliminates scrollbars everywhere -- no per-component fixes needed.

### 2. Clean up inline scrollbar-hiding styles

Remove now-redundant inline `scrollbarWidth`/`msOverflowStyle` styles from:

- **`ExpenseScreen.tsx`** (line 314): Remove `style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}`
- **`MemberChipSelector.tsx`** (line 20): Remove `scrollbarWidth: 'none', msOverflowStyle: 'none'` from style prop (keep `WebkitOverflowScrolling: 'touch'`)

The existing `.chip-scroll` utility class in `index.css` also becomes redundant but can stay for safety.

## Files Modified

| File | Change |
|------|--------|
| `src/index.css` | Add global `*::-webkit-scrollbar { display: none }` and `* { scrollbar-width: none }` rules |
| `src/components/expense/ExpenseScreen.tsx` | Remove inline scrollbar-hiding style from scrollable div |
| `src/components/expense/MemberChipSelector.tsx` | Remove inline scrollbar-hiding styles |

