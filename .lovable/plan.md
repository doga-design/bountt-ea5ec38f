

# Full-Screen Numpad Expense Screen

## Overview
Replace the current `ExpenseSheet` (bottom drawer with basic numpad) with a full-screen "Adding cost" interface featuring member chip selection, dual split modes (equal/custom), and a pixel-perfect numpad matching the provided designs.

## Architecture

The current `ExpenseSheet.tsx` (220 lines, drawer-based) will be completely rewritten as a full-screen overlay component. The component is complex enough to warrant splitting into sub-components.

### New File Structure

| File | Purpose |
|------|---------|
| `src/components/expense/ExpenseScreen.tsx` | Main full-screen container, state orchestration |
| `src/components/expense/MemberChipSelector.tsx` | Horizontal chip row with toggle + Add button |
| `src/components/expense/AmountDisplay.tsx` | Large/compact amount display with mode transition |
| `src/components/expense/SplitSentence.tsx` | "Splitting equally/custom with Names" |
| `src/components/expense/CustomSplitRows.tsx` | Animated member rows for custom mode |
| `src/components/expense/NumpadGrid.tsx` | 4x3 numpad with sub-letters |
| `src/components/expense/SaveButton.tsx` | Stateful save button (disabled/orange/blue) |

### Fonts
- Add Google Fonts `Sora` (display/emphasis) and `DM Sans` (body) to `index.html`
- Update `index.css` body font-family to `'DM Sans'`
- Use `font-family: 'Sora'` on numpad keys, amount display, and emphasis text via utility classes

## Component Details

### 1. ExpenseScreen.tsx (Main Orchestrator)
**State:**
- `amount: string` -- total amount string (numpad input)
- `splitMode: "equal" | "custom"`
- `activeChips: Set<string>` -- member IDs currently in the split (all active by default)
- `focusedMemberId: string | null` -- which custom row receives numpad input
- `customAmounts: Map<string, string>` -- per-member amount strings in custom mode
- `addMemberOpen: boolean` -- controls the AddMemberSheet
- `loading: boolean`

**Props:** Same as current `ExpenseSheet` -- `open`, `onOpenChange`, `isFirstExpense`

**Rendering:** When `open` is true, renders a fixed full-screen div (z-50) over the app content instead of a vaul Drawer. Uses the app background color (`#EBEBEB` from the design).

**Key behaviors:**
- Numpad target: in equal mode always targets `amount`; in custom mode targets `customAmounts[focusedMemberId]` if a member is focused, else targets `amount`
- When `amount` changes in custom mode, all custom amounts reset to equal split
- When chips toggle in custom mode, redistribute equally among remaining active members
- On save: calls `supabase.rpc("create_expense_with_splits", ...)` with the computed splits
- Description field is removed from this screen (uses "Quick Expense" default or we can add a small input at the top -- the designs don't show one, so we'll use "Quick Expense")

### 2. MemberChipSelector.tsx
- Horizontal flexbox with wrapping
- Each chip: 22x22 rounded-square avatar (initials, colored bg) + name
- Active state: dark bg (#1A1A1A), white text. "You" chip uses orange (#E8480A) bg
- Inactive: white bg, light border (#D4D4D4), gray text
- "+ Add" chip: dashed border, muted text -- opens `AddMemberSheet`
- Tapping toggles `activeChips` set; minimum 1 chip must remain active

### 3. AmountDisplay.tsx
- **Equal mode:** Large centered `$0` -- `$` at 34px 700 muted, number at 80px 800 black, letter-spacing -0.07em, blinking orange cursor (CSS animation)
- **Custom mode:** Compact "TOTAL" label (12px 700 uppercase, muted, tracking 0.1em) + `$amount` at 48px 800 + remaining indicator
- Remaining indicator logic: compares sum of custom amounts vs total
- Transition: animate height/font-size change between modes

### 4. SplitSentence.tsx
- "Splitting [mode] with [names]"
- Mode word is tappable toggle: "equally" (orange, 800, dotted underline) or "custom" (blue, 800, dotted underline)
- Disabled (no pointer events, extra muted) when amount is "0"
- Names formatted: 1 = "Kyle", 2 = "Kyle & Anya", 3+ = "Kyle, Anya & Maya"
- Only shows names of OTHER active members (not "You")
- Edge case: if only "You" is active, reads "yourself"

### 5. CustomSplitRows.tsx
- Animated container: max-height transition + opacity
- Each row is a card: white bg, 16px radius, 13px 16px padding, 6px gap
- Left: 36x36 rounded-square avatar
- Center: name (15px 800) + sub-label ("tap to edit" / "editing ^")
- Right: `$` (14px 700 muted) + value (26px 800, orange for "You", blue for others when focused)
- Focus state: colored border, tinted background, box-shadow
- First row auto-focused on entering custom mode
- Tapping a row focuses it for numpad input

### 6. NumpadGrid.tsx
- 3-column CSS grid, 1px gaps, grid background `#DDDDD9` for divider lines
- Keys: `#F5F5F1` bg, Sora 24px 600 `#111`, sub-letters 9px 700 `#C8C8C4`
- Function keys (`.` and backspace): `#EEEEE9` bg
- Active/press: `#EAEAE6` bg
- Sub-letter map: `{2:"ABC", 3:"DEF", 4:"GHI", 5:"JKL", 6:"MNO", 7:"PQRS", 8:"TUV", 9:"WXYZ"}`
- Numpad fills remaining vertical space via flex-1

### 7. SaveButton.tsx
- Full width, 18px radius, Sora 17px 800
- Disabled: `#EAEAE6` bg, `#C0C0BC` text -- when amount=0 OR (custom AND not balanced)
- Default ready: orange bg, white text, orange shadow
- Custom ready: blue (`#3B82F6`) bg, white text, blue shadow
- Press: `scale(0.985)`

## Split Math

**Equal mode:** Uses existing `distributeCents()` from `bountt-utils.ts` -- already handles cent rounding correctly.

**Custom mode:**
- Balanced check: `Math.abs(sumOfCustomAmounts - totalAmount) < 0.01`
- When entering custom: auto-distribute via `distributeCents()`
- When total changes in custom: reset all custom amounts via `distributeCents()`
- When member deselected in custom: redistribute total equally to remaining
- When member added in custom: redistribute total equally to all (full reset)
- Member value clamped to >= 0 (no negatives)

## Integration Points

### Dashboard.tsx
- Replace `<ExpenseSheet>` usage with `<ExpenseScreen>`
- Same props: `open`, `onOpenChange`, `isFirstExpense`

### AddMemberSheet integration
- The "+ Add" chip opens the existing `AddMemberSheet`
- On successful add, the new member appears as an active chip
- In custom mode, this triggers a full equal redistribution

### Save flow
- Uses `supabase.rpc("create_expense_with_splits", ...)` (already exists)
- In equal mode: splits via `distributeCents()`
- In custom mode: splits from `customAmounts` map
- Confetti + toast on first expense (existing behavior preserved)

## CSS / Font Changes

### index.html
- Add Google Fonts link: `Sora:wght@400;600;700;800` and `DM Sans:wght@400;500;600;700;800`

### index.css
- Update body font-family to `'DM Sans', -apple-system, ...`
- Add `.font-sora` utility: `font-family: 'Sora', sans-serif`
- Add blinking cursor keyframe animation

### tailwind.config.ts
- Add `sora` and `dm-sans` to fontFamily extend

## Edge Cases Handled
- Amount $0: save disabled, split sentence mode word disabled
- Only "You" active: sentence says "yourself", save works (solo expense)
- Custom sum > total: red indicator, save disabled
- Custom sum = total: green "perfectly split", save enabled (blue)
- Delete until empty: shows "0", treats as 0
- Member value $0: valid (in split but owes nothing)
- Leading zeros: "05" becomes "5" (existing logic)
- Decimal: max 2 digits after point, only one decimal allowed
- Member added via "+ Add" in custom mode: full redistribution

## Files Modified Summary

| File | Action |
|------|--------|
| `src/components/expense/ExpenseScreen.tsx` | Create |
| `src/components/expense/MemberChipSelector.tsx` | Create |
| `src/components/expense/AmountDisplay.tsx` | Create |
| `src/components/expense/SplitSentence.tsx` | Create |
| `src/components/expense/CustomSplitRows.tsx` | Create |
| `src/components/expense/NumpadGrid.tsx` | Create |
| `src/components/expense/SaveButton.tsx` | Create |
| `src/pages/Dashboard.tsx` | Update -- swap ExpenseSheet for ExpenseScreen |
| `index.html` | Update -- add Google Fonts |
| `src/index.css` | Update -- DM Sans body font, Sora utility, cursor animation |
| `tailwind.config.ts` | Update -- font families |
| `src/components/dashboard/ExpenseSheet.tsx` | Keep as-is (not deleted, just unused for now) |

