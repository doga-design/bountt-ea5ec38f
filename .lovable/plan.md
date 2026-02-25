

# Add Interactive "Distribute" Button to Custom Split Indicator

## Overview

Replace the static remaining-amount text in the custom split view with a tappable pill button that auto-distributes the difference across non-focused members.

## Changes

### 1. `src/components/expense/AmountDisplay.tsx` — Add distribute button

**What changes:**
- Add a new `onDistribute` callback prop (optional, only fires in custom mode)
- Add `canDistribute` boolean prop to control visibility
- When `remaining` is not balanced and `canDistribute` is true, render a pill-shaped `<button>` instead of the static `<span>`
- Label: "Distribute $X.XX →" (positive remaining) or "Remove $X.XX →" (negative remaining)
- Style: pill with `background: #FFF0E8`, `border: 1.5px solid rgba(217, 79, 0, 0.6)`, `color: #D94F00`, font 13px weight 700 (DM Sans via class)
- Active press state: `transform: scale(0.96)` transition
- When balanced: show "perfectly split ✓" in green (existing behavior, no button)
- When `!canDistribute` (single member scenario): fall back to static text

**New props:**
```typescript
interface AmountDisplayProps {
  amount: string;
  splitMode: "equal" | "custom";
  remaining: number;
  isBalanced: boolean;
  onDistribute?: () => void;      // NEW
  canDistribute?: boolean;         // NEW
}
```

### 2. `src/components/expense/ExpenseScreen.tsx` — Add distribution logic + wire up

**What changes:**
- Add a `handleDistribute` callback that:
  1. Gets `focusedMemberId` (the member currently being edited)
  2. Gets all other active members (excluding focused)
  3. If no other members exist, return early (do nothing)
  4. Calculates `remaining = totalNum - customSum`
  5. Divides `remaining` equally across other members, adding to their current values
  6. If distributing negative (over-total): subtract from others but clamp each at $0.00
  7. If clamping prevents full removal, leave whatever remains
  8. Applies `toFixed(2)` rounding, remainder penny goes to last member
  9. Updates `customAmounts` map with new values

- Compute `canDistribute`: true when `splitMode === "custom"` AND there are at least 2 active members AND `focusedMemberId` is set AND there's at least one other member besides the focused one

- Pass `onDistribute` and `canDistribute` to `<AmountDisplay />`

**Distribution logic (pseudocode):**
```
others = selectedMembers.filter(m => m.id !== focusedMemberId)
if (others.length === 0) return

perMember = remaining / others.length
// For each other member:
//   newVal = currentVal + perMember
//   if newVal < 0: clamp to 0, track unclaimed
// Distribute rounding remainder to last member
// Update customAmounts map
```

### 3. No other files change

The `CustomSplitRows`, `NumpadGrid`, `SaveButton`, and `SplitSentence` components remain untouched.

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| Only 1 active member | Button hidden, static text shown |
| Focused member is only one besides excluded | Button hidden |
| Over-total (negative remaining) | "Remove $X.XX →" label, subtracts from others |
| Clamping at $0 | Members won't go negative; leftover shown in indicator |
| Perfectly balanced | Green "perfectly split ✓" text, no button |
| Total is $0 | Static "assign to everyone" text, no button |

## Files Modified

| File | Change |
|------|--------|
| `src/components/expense/AmountDisplay.tsx` | Add distribute button UI with new props |
| `src/components/expense/ExpenseScreen.tsx` | Add `handleDistribute` logic and `canDistribute` computation, pass to AmountDisplay |

