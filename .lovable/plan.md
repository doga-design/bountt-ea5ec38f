
# Fix Expense Screen Layout, Chips, and Styling

## Overview

Restructure the expense screen layout to be fully responsive, fix chip scrolling, remove avatar icons from chips, fix name colors, and ensure nothing gets cropped by the numpad.

## Changes

### 1. MemberChipSelector -- Horizontal scroll, no wrapping, remove avatars (`MemberChipSelector.tsx`)

- Change container from `flex flex-wrap` to `flex flex-nowrap overflow-x-auto` with hidden scrollbar
- **Remove** the colored square avatar/initials element from each chip (Bug 6)
- Change inactive chip text color from `#A0A0A0` to foreground/black (Bug 4 -- names showing blue comes from the `text-blue-500` in SplitSentence, handled separately)
- Keep the `+ Add` chip inline in the same scrollable row

### 2. SplitSentence -- Fix blue name colors (`SplitSentence.tsx`)

- Change all `text-blue-500` classes on member names to `text-foreground` (black) so names display in black, not blue (Bug 4)

### 3. ExpenseScreen -- Scrollable middle, fixed numpad layout (`ExpenseScreen.tsx`)

Current layout is a simple flex column where all children stack. The numpad (`flex-1`) fills remaining space but can overlap content when custom rows are visible.

New layout structure:
```text
Fixed container (100dvh)
  +-- Top bar (flex-shrink-0)
  +-- Description input (flex-shrink-0)
  +-- Scrollable middle (flex-1, overflow-y-auto)
  |     +-- Member chips (horizontal scroll)
  |     +-- Amount display
  |     +-- Split sentence
  |     +-- Custom split rows (when visible)
  +-- Save button (flex-shrink-0)
  +-- Numpad (flex-shrink-0, fixed height)
```

Key changes:
- Use `h-[100dvh]` on the container instead of `inset-0` to handle mobile browser chrome
- Wrap chips through custom rows in a `flex-1 overflow-y-auto min-h-0` scrollable div
- Give numpad a **fixed height** instead of `flex-1` (4 rows x 72px + gaps = ~290px) so it never overlaps content
- The scrollable middle section gets `flex-1` to take remaining space
- Add `pb-[env(safe-area-inset-bottom)]` for iPhone home indicator

### 4. AmountDisplay -- Increase custom mode size (`AmountDisplay.tsx`)

- Increase custom mode total from `text-5xl` to `text-[52px]` (Bug 3 -- total too small)
- Reduce padding from `py-3` to `py-2` in custom mode (Bug 3 -- too much space)
- Reduce padding from `py-6` to `py-4` in equal mode for tighter layout

### 5. NumpadGrid -- Fixed height instead of flex-1 (`NumpadGrid.tsx`)

- Remove `flex-1` from the grid container
- Set explicit grid row height so numpad has a consistent fixed size
- Keep `min-h-[72px]` on keys but don't let the grid expand unbounded

### 6. Description input position (`ExpenseScreen.tsx`)

Per Bug 5, move the description input to sit directly above the Save button instead of below the top bar. Increase its size slightly for prominence.

### 7. CustomSplitRows -- Remove avatars (`CustomSplitRows.tsx`)

- Remove the colored square avatar/initials element from each row to match the chip change (Bug 6)

## Files Modified

| File | Changes |
|------|---------|
| `src/components/expense/ExpenseScreen.tsx` | Restructure layout: scrollable middle + fixed numpad; move description input above Save; use `dvh` units |
| `src/components/expense/MemberChipSelector.tsx` | Horizontal scroll with `flex-nowrap overflow-x-auto`; remove avatar squares from chips |
| `src/components/expense/SplitSentence.tsx` | Change `text-blue-500` to `text-foreground` on all name spans |
| `src/components/expense/AmountDisplay.tsx` | Increase custom total size; reduce vertical padding |
| `src/components/expense/NumpadGrid.tsx` | Remove `flex-1`; use fixed height grid |
| `src/components/expense/CustomSplitRows.tsx` | Remove avatar squares from member rows |
| `src/components/expense/SaveButton.tsx` | No changes needed (already correct) |
