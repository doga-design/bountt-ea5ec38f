

## Fix: Import all needed Geist Sans font weights

### Problem
Only the regular (400) weight of Geist Sans is being imported via `@fontsource/geist-sans`. When Tailwind classes like `font-medium`, `font-semibold`, or `font-bold` are used, the browser fakes (synthesizes) those weights from the 400 file — this looks noticeably different from native Geist Sans at those weights.

### Solution
Update `src/main.tsx` to import the specific weight variants used throughout the app.

**File: `src/main.tsx`**
Replace the single `@fontsource/geist-sans` import with individual weight imports:
```ts
import "@fontsource/geist-sans/400.css";
import "@fontsource/geist-sans/500.css";
import "@fontsource/geist-sans/600.css";
import "@fontsource/geist-sans/700.css";
```

This ensures all 4 commonly used weights load their proper font files instead of relying on browser synthesis.

### What this fixes
- `font-medium` (500) text will render with the real Geist Sans medium weight
- `font-semibold` (600) and `font-bold` (700) will use proper font files
- Eliminates the "slightly off" look on bold/medium text throughout the app

### No other changes needed
- The CSS `font-family` declarations are already correct
- Tailwind config already maps `font-sans` to Geist Sans
- Both fonts (Geist Sans and BringBoldNineties) are loading successfully

