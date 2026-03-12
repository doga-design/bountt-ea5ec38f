# Three Fixes: Auto-Close, Hide Payer from Spokes, Settlement Confetti

## 1. Auto-close on full settlement

**File:** `ExpenseDetailSheet.tsx`

Add a `useEffect` watching `expenseFullySettled`. When it transitions to `true` while the drawer is open, close the drawer after a short delay (~800ms so the user sees the settled state briefly).

The `onOpenChange(false)` call will close the drawer. A callback prop or state flag will signal Dashboard to fire confetti (see fix 3).

## 2. Hide payer from spoke visualization

**Files:** `ExpenseDetailSheet.tsx`, `ExpenseSpokeViz.tsx`

Currently `spokeMembers` is built from ALL `expenseSplits`. The payer's own split should be filtered out:

```
const spokeMembers = expenseSplits
  .filter(s => s.user_id !== expense.paid_by_user_id)
  .map(...)
```

Same filter for `settledMembers` (used by `ExpenseSettledState`).

For the subtitle, `otherSplitNames` already filters out the payer — no change needed there.

**Activity log:** When `action_type === "added"` and the actor is the payer, change label to "Paid & Settled Share" instead of just "Paid". This is display-only in `ExpenseDetailSheet.tsx` line ~471.

Also filter the payer out of `hasUnsettledSplits` check (line 296) so the slide-to-settle only considers non-payer splits.

## 3. Confetti on settlement (fires on feed after drawer closes)

**Files:** `ExpenseDetailSheet.tsx`, `Dashboard.tsx`

Add an `onSettled` callback prop to `ExpenseDetailSheet`. When any settlement succeeds (settle_my_share, settle_member_share, settle_all), call `onSettled()` right before/after the toast.

When full settlement triggers auto-close (fix 1), also call `onSettled()`.

In `Dashboard.tsx`, the `onSettled` handler fires a large `canvas-confetti` burst (already installed as a dependency). The confetti fires after the drawer closes, so it covers the feed viewport.

```ts
import confetti from "canvas-confetti";

const handleSettled = () => {
  setTimeout(() => {
    confetti({ particleCount: 200, spread: 120, origin: { y: 0.4 } });
  }, 300); // slight delay for drawer close animation
};
```

Pass `onSettled={handleSettled}` to `ExpenseDetailSheet`.

## Files changed


| File                     | Change                                                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `ExpenseDetailSheet.tsx` | Filter payer from spokeMembers/settledMembers, auto-close on full settlement, add `onSettled` prop, update activity log label for payer |
| `ExpenseSpokeViz.tsx`    | No changes needed (filtering happens in parent)                                                                                         |
| `Dashboard.tsx`          | Add `onSettled` prop + confetti handler, pass to `ExpenseDetailSheet`                                                                   |


No DB changes required.  
  
(extra: 4. **Cost detail window size** — Make sure this "cost detail" window covers most of the viewport height so its way taller )