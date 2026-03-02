
# Fix: Expense Screen as Slide-Up Drawer Overlay

## Problem
The expense screen is currently a solid full-screen div (`fixed inset-0 z-50 bg-background`) that completely hides the page behind it. The user wants it to behave like a drawer that slides up from the bottom over a dark, blurred overlay -- so the dashboard feed is still visible behind it.

## Solution
Replace the opaque full-screen container with a proper slide-up overlay pattern:

### Changes (1 file: `src/components/expense/ExpenseScreen.tsx`)

**Wrapper structure** (replaces lines 547-719):

1. **Backdrop layer**: A `fixed inset-0` div with `bg-black/60 backdrop-blur-sm` that shows the page behind it, tinted and blurred. Tapping it dismisses the screen (`onOpenChange(false)`).

2. **Slide-up panel**: A `fixed inset-x-0 bottom-0` div that holds all the content. Height set to `85dvh` (enough room for numpad without cropping). Rounded top corners (`rounded-t-2xl`). Solid `bg-background`.

3. **Slide animation**: 
   - On mount: panel translates from `translateY(100%)` to `translateY(0)` (slides up)
   - On dismiss: slides back down before unmounting
   - Use CSS transition (`transform 0.3s ease-out`) with a state variable to control the animation
   - Backdrop fades in/out alongside the panel

4. **Internal layout**: Both Step 1 and Step 2 content remain exactly as-is inside the panel. The panel uses `flex flex-col h-full` so the numpad stays pinned to the bottom.

### Animation approach
- Add a `visible` state that starts `false`, then sets to `true` on next frame (via `requestAnimationFrame`) to trigger the CSS transition
- On close: set `visible` to `false`, wait for transition to end (300ms), then call `onOpenChange(false)`
- This gives native-feeling slide-in / slide-out without adding any dependencies

### What does NOT change
- All internal state, 2-step flow, cover mode logic, save handlers
- NumpadGrid, AmountDisplay, SplitSentence, SaveButton, CustomSplitRows
- No new files, no new dependencies
