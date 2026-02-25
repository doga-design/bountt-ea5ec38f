

# Fix "Distribute" Button Logic

## Problem
Currently, tapping "Distribute $X.XX -->" splits the remaining amount across all members **except** the focused one. The correct behavior should be the **opposite** of "Remove": add the entire remaining amount to the **focused member only**.

## Change

### `src/components/expense/ExpenseScreen.tsx` (lines 101-132)

Replace the current `handleDistribute` logic with a simple addition to the focused member's value:

```typescript
const handleDistribute = useCallback(() => {
  if (!focusedMemberId || remaining <= 0.01) return;

  const newAmounts = new Map(customAmounts);
  const current = parseFloat(newAmounts.get(focusedMemberId) || "0") || 0;
  const newVal = current + remaining;
  newAmounts.set(focusedMemberId, newVal.toFixed(2));
  setCustomAmounts(newAmounts);
}, [focusedMemberId, remaining, customAmounts]);
```

This means:
- **"Distribute $X.XX -->"** adds all unassigned amount to the currently focused member
- **"Remove $X.XX -->"** (over-total case) keeps existing behavior of removing excess from others

The `canDistribute` condition stays the same -- the button still only appears when there's a focused member and multiple active members.

## Files Modified

| File | Change |
|------|--------|
| `src/components/expense/ExpenseScreen.tsx` | Simplify distribute logic to add remaining to focused member |

