# Bountt — Numpad & Cost Log Fixes

## Fix 1: Placeholder ghost avatars

`getAvatarImage` in `src/lib/avatar-utils.ts` already uses `member.id` only and has no ghost/placeholder fallback. All consuming components (`MemberAvatarGrid`, `PayerAvatar`, `CustomSplitRows`, `SplitSentence`) call `getAvatarImage(m)` directly with no conditional fallback. No changes needed here — already clean.

## Fix 2: Payer avatar tap opens payer selector

**File**: `src/components/expense/ExpenseScreen.tsx` (lines 612-617)

Currently the PayerAvatar onClick only shows a toast in edit mode and does nothing in create mode. The payer selector drawer lives inside `SplitSentence.tsx` as internal state (`payerSheetOpen`).

**Solution**: Lift the payer drawer state out of `SplitSentence` and into `ExpenseScreen`:

- Add `payerDrawerOpen` state to `ExpenseScreen`
- Pass it down to `SplitSentence` as a controlled prop
- Wire PayerAvatar's `onClick` to set `payerDrawerOpen(true)` (or show locked toast in edit mode)
- Wire the "you" button on Slide 1 to the same function

**Changes to `SplitSentence.tsx**`:

- Replace internal `payerSheetOpen` state with props: `payerDrawerOpen` and `onPayerDrawerChange`
- Payer name tap calls `onPayerDrawerChange(true)` instead of `setPayerSheetOpen(true)`

**Changes to `ExpenseScreen.tsx**`:

- Add `const [payerDrawerOpen, setPayerDrawerOpen] = useState(false)`
- Create `openPayerDrawer` function that checks edit mode (toast) or opens drawer
- Wire PayerAvatar onClick to `openPayerDrawer`
- Wire Slide 1 "you" button onClick to `openPayerDrawer`
- Pass `payerDrawerOpen` and `setPayerDrawerOpen` to SplitSentence

## Fix 3: "You" tap on Slide 1 opens payer selector

Covered by Fix 2 above — the Slide 1 "you" button (line 544) will call the same `openPayerDrawer` function.

## Fix 4: Remove duplicate total in custom mode

**File**: `src/components/expense/ExpenseScreen.tsx` (lines 648-657)

Remove the second `AmountDisplay` component rendered inside the custom mode block. The distribute/remaining pill will move into the `CustomSplitRows` area or be rendered separately without a duplicate amount display.

**Solution**: Remove the `<AmountDisplay>` on lines 649-657. Keep only the status pill (distribute button / "perfectly split" indicator). Extract the status pill logic from `AmountDisplay` into a small inline block or a dedicated component rendered above `CustomSplitRows`.

## Fix 5: Hide MemberAvatarGrid in custom mode

**File**: `src/components/expense/ExpenseScreen.tsx` (lines 638-644)

Wrap `MemberAvatarGrid` in a conditional: only render when `splitMode === "equal"`. The grid is already not rendered in custom mode's `CustomSplitRows` block, but it's currently always visible above it.

**Change**: `{splitMode === "equal" && <MemberAvatarGrid ... />}`

## Fix 6: "+" button overlay positioning

**File**: `src/components/expense/MemberAvatarGrid.tsx` (lines 74-95)

Currently the "+" button is a separate item at the end of the flex row. Redesign it to overlay on the top-right corner of the last member avatar, as shown in img3.

**Solution**:

- Remove the standalone "+" flex item
- Wrap the last member avatar in a `relative` container
- Add a small circular "+" button (approximately 28px) positioned `absolute` at top-right, slightly overlapping the avatar circle
- Style: light gray background, subtle border/shadow, "+" icon inside
- No click handler (visual only)

---

## Files Modified


| File                                          | Changes                                                                                                                                                          |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/expense/ExpenseScreen.tsx`    | Add `payerDrawerOpen` state, wire payer avatar + "you" button, conditionally render MemberAvatarGrid (equal only), remove duplicate AmountDisplay in custom mode |
| `src/components/expense/SplitSentence.tsx`    | Accept controlled drawer props (`payerDrawerOpen`, `onPayerDrawerChange`) instead of internal state                                                              |
| &nbsp;                                        | &nbsp;                                                                                                                                                           |
| `src/components/expense/MemberAvatarGrid.tsx` | Reposition "+" button to overlay top-right of last member avatar                                                                                                 |
| `src/components/expense/AmountDisplay.tsx`    | Extract status pill as a standalone export or keep the distribute pill renderable without the amount display                                                     |
