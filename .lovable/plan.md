

## Simplify Splash Screen

### Changes

**`src/pages/Splash.tsx`** — Rewrite the return JSX only:
- Remove the `splashHand` import (line 4)
- Remove the tagline and hand image
- Set background to `bg-primary` (the dark blue `#003C69`)
- Center the wordmark vertically with brand yellow dot: `bountt.`
- Use inline style for the yellow dot color (`#F5A623` or similar brand yellow from existing usage)
- Reduce min timer from 2200ms → 1500ms
- Keep all navigation logic untouched

**`src/assets/bountt-splash-hand.png`** — Delete file (no longer referenced)

### Files NOT touched
- `src/index.css` — no changes
- `src/pages/Auth.tsx` — no changes
- No color token changes anywhere

