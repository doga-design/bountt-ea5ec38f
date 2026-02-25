

# Payer-Always-Included Split Logic

## What Changes

Three modifications to enforce the rule that the payer is always part of the split and cannot be removed:

1. **Payer always in `activeIds`** -- When payer changes or member toggles, enforce payer membership
2. **Payer checkbox disabled in drawer** -- Visual lock with "(payer)" label
3. **Payer selection via drawer** -- Replace the cycle-on-tap with a dedicated payer selection drawer (tap payer name to open list of all members, tap one to select)

## Current State (Already Working)

- The sentence already filters the payer out of the "with..." list (line 53 of SplitSentence: `activeMembers.filter(m => m.id !== payerMember?.id)`)
- Custom mode already shows all `selectedMembers` including payer if they're in `activeIds`
- `handleToggleChip` already prevents removing the last member

## Files Modified

| File | Change |
|------|--------|
| `src/components/expense/ExpenseScreen.tsx` | Enforce payer in `activeIds` on toggle and payer change; new `setPayer` handler |
| `src/components/expense/SplitSentence.tsx` | Disable payer checkbox in member drawer; add payer selection drawer (replaces cycle); pass `payerId` to drawer logic |

## Technical Details

### ExpenseScreen.tsx

**1. Enforce payer in `handleToggleChip`:**

Prevent unchecking the payer. If `memberId === payerMember?.id` and the action would remove them, return early (no-op).

**2. New `handleSetPayer` function (replaces `cyclePayer`):**

```
handleSetPayer(memberId):
  setPayerId(memberId)
  // Ensure new payer is in activeIds
  setActiveIds(prev => {
    if (prev.has(memberId)) return prev
    const next = new Set(prev)
    next.add(memberId)
    // If custom mode, redistribute
    if (splitMode === "custom") { ... redistribute ... }
    return next
  })
```

**3. Pass `payerId` to SplitSentence** so it knows which member to lock in the drawer.

**4. Update `isSingleUser` check:** Since payer is always included, `selectedMembers.length <= 1` means only the payer is selected (just themselves). The sentence should show "You paid" with no "with" clause -- this already works via the `others.length === 0` branch showing "yourself".

### SplitSentence.tsx

**1. Payer checkbox disabled in member drawer:**

```
const isPayer = m.id === payerMember?.id;

<button disabled={isPayer} onClick={...}>
  <span>{label}{isPayer ? " (payer)" : ""}</span>
  <div className={isPayer ? "bg-primary opacity-50" : isChecked ? "bg-primary" : "border-2 ..."}>
    {(isChecked || isPayer) && <Check />}
  </div>
</button>
```

**2. Replace `onCyclePayer` with payer selection drawer:**

Add a second drawer state (`payerSheetOpen`). When user taps the payer name, it opens this drawer showing all active members. Tapping a member calls `onSetPayer(memberId)` and closes the drawer. The currently selected payer gets a checkmark.

**3. Updated props:**
- Remove `onCyclePayer`
- Add `onSetPayer: (memberId: string) => void`

## Edge Cases

- **Payer changes**: New payer auto-added to `activeIds`; old payer becomes toggleable in the member drawer
- **Only payer selected**: Valid state -- sentence shows "yourself", balance nets to $0
- **Custom mode + payer change**: Triggers redistribution (same as toggling a member)
- **Payer at $0 in custom**: Allowed -- payer paid but owes nothing, others owe full amount

