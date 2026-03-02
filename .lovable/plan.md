

# Fix: Numpad Cropping in Expense Drawer

## Problem
The vaul Drawer at 80% height (`snapPoints={[0.8]}`, `maxHeight: '80dvh'`) does not provide enough vertical space for Step 1's content (header + amount display + continue button + numpad). The numpad rows get compressed and overflow below the visible area.

This matches the plan's fallback rule: *"If converting to a Drawer component introduces any layout issues with the numpad or keyboard on mobile, keep the existing full-screen container and implement the 2-step flow within it instead."*

## Solution
Replace the vaul `Drawer`/`DrawerContent` wrapper with a full-screen overlay (the original container pattern) while keeping the 2-step flow logic intact.

### Changes (1 file)

**`src/components/expense/ExpenseScreen.tsx`**

1. Remove the `Drawer` and `DrawerContent` imports from `@/components/ui/drawer`
2. Replace the `<Drawer>` + `<DrawerContent>` wrapper with a conditional full-screen `div` overlay:
   - `fixed inset-0 z-50 bg-background` container (same as the original pre-refactor pattern)
   - `max-w-[430px] mx-auto` to maintain the app's width constraint
   - `min-height: 100dvh` for proper mobile viewport handling
   - The overlay renders only when `open` is true
   - Closing calls `onOpenChange(false)` (same as before)
3. Remove the `snapPoints`, `activeSnapPoint`, and `fadeFromIndex` props (no longer needed)
4. Keep everything else identical: the 2-step flow, cover mode, all state logic, save handlers

No other files change. Step 2 content, cover mode, sentence system, save button -- all untouched.
