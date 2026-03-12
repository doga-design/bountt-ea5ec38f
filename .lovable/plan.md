# Audit: Removing the Payer's Split Row

## Answers to Every Audit Question

### Where is the payer's split row created?

`**ExpenseScreen.tsx` lines 156-163**: `splitMembers` is built by prepending `payerMember` to `selectedMembers`. This array is then used to build the `splits` payload at lines 435-452, which is sent to both `create_expense_with_splits` and `edit_expense` RPCs. The RPCs insert every element of `p_splits` as a row — they have no payer-filtering logic. So the payer always gets a split row.

### Every place client-side code reads `expenseSplits`


| File                                         | Lines                                                   | Depends on payer row?                                                                                                                                                                                                                |
| -------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ExpenseDetailSheet.tsx` line 70             | Filters by `expense_id`                                 | No — payer is filtered out at line 111 (`nonPayerSplits`)                                                                                                                                                                            |
| `ExpenseDetailSheet.tsx` line 93-95          | `otherSplitNames` for subtitle                          | No — already filters `user_id !== paid_by_user_id`                                                                                                                                                                                   |
| `ExpenseDetailSheet.tsx` line 322            | `hasUnsettledSplits` uses `nonPayerSplits`              | No                                                                                                                                                                                                                                   |
| `ExpenseFeedItem.tsx` lines 106, 110-128     | `mySplit`, `payerInSplits`, `nonPayerSplits`            | **YES** — `payerInSplits` (line 110) checks if payer has a split to detect "cover" expenses. If payer row is removed, `payerInSplits` will always be `false`, making ALL expenses look like "covers". **This is a breaking change.** |
| `ExpenseFeedItem.tsx` line 136               | `isSolo` check                                          | **YES** — checks `splits.length === 1 && splits[0].user_id === currentUserId`. Without payer row, this never matches. Solo detection breaks.                                                                                         |
| `BalancePill.tsx` lines 19-25                | Sums splits where `user_id === user.id`                 | **YES** — currently includes payer's own split in `totalOwed`. Removing payer row changes the math. But this is actually **correct** — the payer shouldn't owe themselves. Removing the row fixes the balance.                       |
| `useHeroData.ts` lines 71-73                 | Filters `user_id !== userId` for "I paid" case          | No — already excludes payer                                                                                                                                                                                                          |
| `useHeroData.ts` lines 94-96                 | Finds `user_id === userId` for "someone else paid" case | No — only looks at current user's split on expenses they didn't pay                                                                                                                                                                  |
| `NetBalanceSlide.tsx`                        | Calls `settle_my_share` and `settle_all`                | No direct split reading                                                                                                                                                                                                              |
| `bountt-utils.ts` `calculateBalances`        | Marked `@deprecated`, only reads `paid_by_user_id`      | No impact                                                                                                                                                                                                                            |
| `ExpenseScreen.tsx` lines 94-118 (edit mode) | Rebuilds `activeIds` from `editSplits`                  | **YES** — payer's split is used to find the payer member, then deleted from `activeIds` at line 113. Without payer row, this filter is harmless (no-op).                                                                             |


### `calculateBalances` in `bountt-utils.ts`

Deprecated function. Only uses `expense.paid_by_user_id` and `expense.amount`. Does NOT read splits. No impact.

### `BalancePill.tsx` balance math

Currently: `totalPaid = sum of expense.amount where I'm payer`, `totalOwed = sum of my split.share_amount`. With payer row present, when I pay $30 split 3 ways, `totalPaid = 30` and `totalOwed` includes my $10 split, giving net = $20. Without payer row, `totalOwed` won't include that $10, giving net = $30. **This is actually more correct** — I paid $30, others owe me $20, net = $30 paid - $0 splits = $30... wait, that's wrong.

Actually let me re-examine: the pill shows `totalPaid - totalOwed`. Currently with payer split: paid $30, owed $10 (my share), net = $20 ("owed to me"). Without payer split: paid $30, owed $0, net = $30. But the real net should be $20 (others owe me $20). **The BalancePill math is wrong today and will get worse without the payer row.** It needs rewriting to match `useHeroData` logic.

### `ExpenseSpokeViz`

Receives `members` prop which is already filtered to `nonPayerSplits` in `ExpenseDetailSheet` line 111-126. No impact.

### `ExpenseFeedItem` — detailed impact

- `**payerInSplits` (line 110-116)**: This is the "cover" detection. A "cover" expense is when the payer pays for others but is NOT included in the split (they don't owe themselves anything). Currently, the payer always has a split, so `payerInSplits` is always `true` and `isCover` is always `false`. **Removing the payer row makes `payerInSplits` always `false` and `isCover` always `true`.** The fix: change cover detection to check `expense.expense_type` or compare total split sum vs expense amount, or simply remove the cover concept since payer-not-in-splits is now the normal case.
- `**isSolo` (line 135-136)**: Checks `isPayer && splits.length === 1 && splits[0].user_id === currentUserId`. Without payer row, a solo expense has 0 splits. Fix: `isPayer && splits.length === 0`.

### `settle_my_share` — can the payer call it?

Yes. The RPC finds the split where `user_id = auth.uid()`. If the payer has a split, they can settle it. Without the payer row, this call would raise "No split found" — which is correct behavior (payer shouldn't settle with themselves).

### `settle_all` — does it settle payer's split?

Yes — `UPDATE expense_splits SET is_settled = true WHERE expense_id = p_expense_id AND is_settled = false` settles ALL splits including payer's. Without payer row, it just settles non-payer splits. Correct.

### `settle_member_share` — same?

Operates on a specific `p_split_id`. No payer involvement unless someone passes the payer's split ID. Correct.

### Is there UI that renders the payer as a split participant?

No — `ExpenseDetailSheet` filters payer out everywhere. `ExpenseSpokeViz` only receives non-payer members.

### Does any query use split count for participant count?

`**ExpenseFeedItem` line 158**: `expense.amount / splits.length` for "not involved" per-person amount. Without payer row, `splits.length` is one less, changing the per-person display. But this is a cosmetic calculation for non-involved users and will actually show the correct per-non-payer amount.

### Existing payer split rows in DB?

Yes — every expense has one. Need a data migration to delete them and cascade `is_settled`.

### Edge case: payer is also a non-payer?

Not possible. Each expense has one payer. A person is either the payer or a split participant, never both.

---

## Bug List

### Bug A: `ExpenseFeedItem.payerInSplits` will always be false

**File:** `ExpenseFeedItem.tsx` lines 110-117
**Risk:** Every expense will display as a "cover" expense (wrong labels, wrong amounts)
**Fix:** Remove `payerInSplits` / `isCover` logic. Since payer never has a split row, the normal case IS "payer not in splits". Replace with: `const isCover = expense.expense_type === 'cover'` or simply treat all expenses as normal splits (the payer paid, others owe).

### Bug B: `ExpenseFeedItem.isSolo` will never match

**File:** `ExpenseFeedItem.tsx` line 135-136
**Fix:** Change to `const isSolo = isPayer && splits.length === 0`

### Bug C: `BalancePill.tsx` math is wrong

**File:** `BalancePill.tsx` lines 9-27
**Root cause:** Uses `sum of my splits` as `totalOwed`, but should use split-level logic like `useHeroData`. With payer row removed, this gets worse.
**Fix:** Rewrite to match `useHeroData` pattern: for expenses I paid, sum non-payer unsettled splits = owed to me. For expenses others paid, find my unsettled split = I owe.

### Bug D: `ExpenseFeedItem` per-person calculation

**File:** `ExpenseFeedItem.tsx` line 158
**Risk:** Minor — `expense.amount / splits.length` now divides by N-1 instead of N. For non-involved users this is cosmetic. Low risk.

---

## Changes Required

### DB Changes (migration)

1. **Update `create_expense_with_splits` RPC**: After inserting all splits, delete the payer's row:
  ```sql
   DELETE FROM expense_splits WHERE expense_id = v_expense_id AND user_id = p_paid_by_user_id;
  ```
2. **Update** `edit_expense` **RPC**: Same — after re-inserting splits, delete the payer's row. (The RPC-level delete is only needed as a safety net, not the primary fix. Primary fix is client-side before the payload is sent.)
3. **Data migration**: Delete all existing payer split rows, then cascade `is_settled`:
  ```sql
   DELETE FROM expense_splits es USING expenses e
   WHERE es.expense_id = e.id AND es.user_id = e.paid_by_user_id;

   UPDATE expenses SET is_settled = true, updated_at = now()
   WHERE is_settled = false
   AND NOT EXISTS (
     SELECT 1 FROM expense_splits WHERE expense_id = expenses.id AND is_settled = false
   );
  ```
4. The "all settled" checks in `settle_my_share`, `settle_member_share`, `settle_all` need no change — they already check `NOT EXISTS ... is_settled = false`. Without the payer row, the check naturally works.

### Client-Side Changes


| File                                | Change                                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| `ExpenseScreen.tsx` lines 156-163   | Remove payer from `splitMembers`. Only include `selectedMembers`. Payer is NOT a split participant. |
| `ExpenseFeedItem.tsx` lines 110-117 | Remove `payerInSplits` / `isCover` detection. All normal expenses have payer outside splits now.    |
| `ExpenseFeedItem.tsx` line 136      | Change `isSolo` to `isPayer && splits.length === 0`                                                 |
| `BalancePill.tsx`                   | Rewrite balance math to use `useHeroData`-style split logic                                         |
| `ExpenseDetailSheet.tsx`            | Payer filters (line 111, 134) become no-ops (defensive guards). Keep them.                          |


### Filters that become redundant but should stay as guards

- `ExpenseDetailSheet.tsx` line 111: `nonPayerSplits` filter
- `ExpenseDetailSheet.tsx` line 93-95: `otherSplitNames` filter
- `useHeroData.ts` line 72: `user_id !== userId` filter

## Implementation Order

1. `ExpenseScreen.tsx` — remove payer from splits array before payload is sent. Fix the source first.
2. **DB migration** — add payer-row delete as safety net in both RPCs, then one-time data cleanup and cascade.
3. `**ExpenseFeedItem.tsx**`: Fix `isCover` and `isSolo` logic
4. `**BalancePill.tsx**`: Rewrite balance math
5. **Verify**: `ExpenseDetailSheet`, `useHeroData`, `NetBalanceSlide` need no changes