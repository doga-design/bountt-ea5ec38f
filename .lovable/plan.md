

## Redesign Splash Screen

### Current state
- Splash shows wordmark + tagline + hand PNG asset
- Uses a fixed 2200ms timer, then waits for auth/groups data — sequential, not parallel
- The logic is already *close* to correct (it waits for both timer AND data), but the min timer is too long and the visual design needs simplifying

### Design changes

**Visual**: Remove the hand PNG entirely. Center the wordmark vertically on a `bg-primary` (Bountt Orange) background. The dot in "bountt." rendered in brand yellow/white for contrast. Remove the tagline. Clean, minimal launch screen.

**Logic**: Already implements the "good" pattern (waits for BOTH min time AND data), but reduce min time from 2200ms → 1500ms to feel snappier while still preventing flash.

### Changes

**File: `src/pages/Splash.tsx`** — Full rewrite:
- Remove `bountt-splash-hand.png` import
- Set background to `bg-primary` (Bountt Orange)
- Center wordmark vertically with white text + yellow dot
- Add a subtle fade-in animation via Tailwind `animate-` class
- Reduce timer from 2200ms → 1500ms
- Keep existing navigation logic unchanged (it's already the "good" parallel pattern)

**File: `src/index.css`** — Add a simple `fade-in` keyframe animation for the wordmark entrance

**File: `src/assets/bountt-splash-hand.png`** — Delete (no longer referenced)

### Technical detail
The current logic already runs the timer and data fetching in parallel (AppContext fetches on mount, timer runs independently, navigation fires when both resolve). We're just tightening the minimum visual time.

