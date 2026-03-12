

# Implementation Plan: Settle on Member Removal + Auto-Settle Two-Person UI

## Step 1 — New RPC: `settle_member_and_remove`

Create a database migration with a `SECURITY DEFINER` function:

- **Parameters:** `p_group_id uuid`, `p_member_id uuid` (the `group_members.id`)
- **Logic:**
  1. Verify `auth.uid()` is the group creator (`groups.created_by`)
  2. Get the member's `user_id` and `name` from `group_members` where `id = p_member_id`
  3. Find all unsettled splits for that member across the group: join `expense_splits` on `expenses.group_id = p_group_id` where `expense_splits.user_id = v_member_user_id` (or `member_name = v_member_name AND user_id IS NULL` for placeholders) and `is_settled = false`
  4. Settle each: `UPDATE expense_splits SET is_settled = true, settled_at = now()`
  5. For each affected expense, check if all splits are now settled → mark `expenses.is_settled = true`
  6. Write one activity log entry with action_type `'member_settled_and_removed'`
  7. Update `group_members SET status = 'left', left_at = now()` where `id = p_member_id`
  8. Return `jsonb_build_object('splits_settled', v_count, 'total_amount', v_total)`
- All within one transaction — if any step fails, everything rolls back.

## Step 2 — AppContext: Add `settleAndRemoveMember`

In `AppContext.tsx`:
- Add `settleAndRemoveMember(groupId: string, memberId: string)` that calls the new RPC
- On success: refetch members, expenses, and splits
- On error: show toast, no state changes
- Add to context value and `AppContextValue` type

## Step 3 — Feature 1 UI: Member removal with settlement prompt

### MemberCard.tsx changes
- Accept new props: `hasUnsettledSplits: boolean`, `onSettleAndRemove: () => void`
- When swipe confirms:
  - If `hasUnsettledSplits`: show enhanced AlertDialog with title "[Name] still has unsettled costs in this group. Settle everything before they leave?" and two actions: "Yes, settle all" (calls `onSettleAndRemove`) and "Remove anyway" (calls `onRemove`)
  - If no unsettled splits: show current simple confirmation

### MembersList.tsx changes
- Import `settleAndRemoveMember` from AppContext
- For each member, compute `hasUnsettledSplits` by checking `expenseSplits` from context
- Pass `hasUnsettledSplits` and `onSettleAndRemove` handler to each `MemberCard`
- Need `expenses` and `expenseSplits` — these are available via `useApp()`

### MemberDetailSheet.tsx changes
- Accept new props: `hasUnsettledSplits: boolean`, `onSettleAndRemove: () => void`
- Replace the direct `onClick={onRemove}` on the Remove button with opening an AlertDialog:
  - If unsettled: enhanced dialog with "Yes, settle all" / "Remove anyway"
  - If no unsettled: simple "Remove [Name]?" confirmation with Confirm/Cancel

### GroupSettings.tsx changes
- Compute `hasUnsettledSplits` for `selectedMember`
- Pass `settleAndRemoveMember` from context, wire up `onSettleAndRemove` prop to `MemberDetailSheet`
- Pass unsettled check data to determine which dialog variant to show

### Data freshness note
`expenseSplits` in AppContext is kept up-to-date via realtime subscriptions on `expense_splits` (the `splitsChannelRef`). The check is reliable at the moment of removal — any splits added by other members in real time will already be reflected.

## Step 4 — Feature 2 UI: Hide slider on two-split expenses

In `ExpenseDetailSheet.tsx`, the slider renders at line 505 with condition:
```
{isPayer && hasUnsettledSplits && !expenseFullySettled && (
```

Add one more condition: `expenseSplits.length > 2`. When there are exactly 2 splits (payer + one other), the non-payer settling their share auto-settles the expense via the existing `settle_my_share` RPC logic. The slider is redundant.

Updated condition:
```
{isPayer && hasUnsettledSplits && !expenseFullySettled && expenseSplits.length > 2 && (
```

No RPC changes. No auto-close or confetti changes needed.

## Files changed

| File | Change |
|---|---|
| New migration | `settle_member_and_remove` RPC |
| `src/types/index.ts` | Add `settleAndRemoveMember` to `AppContextValue` |
| `src/contexts/AppContext.tsx` | Add `settleAndRemoveMember` function + expose in context |
| `src/components/group-settings/MemberCard.tsx` | Accept `hasUnsettledSplits` + `onSettleAndRemove`, show conditional dialog |
| `src/components/group-settings/MembersList.tsx` | Compute unsettled check, pass new props |
| `src/components/group-settings/MemberDetailSheet.tsx` | Add confirmation AlertDialog with settlement option |
| `src/pages/GroupSettings.tsx` | Wire up `settleAndRemoveMember`, pass unsettled data |
| `src/components/dashboard/ExpenseDetailSheet.tsx` | Hide slider when `expenseSplits.length <= 2` |

