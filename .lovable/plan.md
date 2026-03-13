

# Fix Plan: 8 Bugs in Priority Order

## Fix 1 — DB Migration: Block editing partially settled expenses

**File:** New migration SQL  
**Change:** In `edit_expense` RPC (the overloaded version with `p_expense_type`), immediately after the `IF v_old_expense.is_settled THEN RAISE EXCEPTION` check, add:

```sql
IF EXISTS (SELECT 1 FROM expense_splits WHERE expense_id = p_expense_id AND is_settled = true) THEN
  RAISE EXCEPTION 'This expense has been partially settled and cannot be edited';
END IF;
```

Also add the same check to the older `edit_expense` overload (without `p_expense_type`) for consistency.

---

## Fix 2 — Slide-to-settle snap-back on error

**File:** `src/components/dashboard/ExpenseDetailSheet.tsx`  
**Change:** In `handleSettleAll` catch block (lines 252-253), add `setSlideCompleted(false)` and `setSlideX(0)` before the toast.

---

## Fix 3 — Wire up `settle_member_and_remove` with confirmation dialogs

### 3a. Add `settleAndRemoveMember` to AppContext

**File:** `src/types/index.ts`  
Add to `AppContextValue` interface: `settleAndRemoveMember: (groupId: string, memberId: string) => Promise<void>;`

**File:** `src/contexts/AppContext.tsx`  
Add new function that calls `supabase.rpc("settle_member_and_remove", { p_group_id: groupId, p_member_id: memberId })`, then refetches expenses, splits, and members. Export it in the context value.

### 3b. Implement confirmation flow in MemberDetailSheet

**File:** `src/components/group-settings/MemberDetailSheet.tsx`  
Replace the direct `onRemove` call on the Remove button with:
- Accept `expenseSplits` and `onSettleAndRemove` as new props
- On click: check if member has unsettled splits (`expenseSplits.filter(s => s.user_id === member.user_id && !s.is_settled).length > 0`)
- If yes: show AlertDialog — "[Name] still has unsettled costs. Settle everything before they leave?" → "Yes, settle all" calls `onSettleAndRemove`, "Remove anyway" calls `onRemove`
- If no: show simple AlertDialog — "Remove [Name]?" → Confirm/Cancel

### 3c. Wire up in GroupSettings.tsx

**File:** `src/pages/GroupSettings.tsx`  
Pass `settleAndRemoveMember` from AppContext as `onSettleAndRemove` prop to MemberDetailSheet. Pass `expenseSplits`.

### 3d. Wire up in MembersList.tsx / MemberCard.tsx

**File:** `src/components/group-settings/MembersList.tsx`  
Replace the direct `removeMember` call in `handleRemove` with the same confirmation logic: check unsettled splits, show appropriate dialog. Import `settleAndRemoveMember` from AppContext.

---

## Fix 4 — ActivityLog.tsx: Show member name for settle_member_share

**File:** `src/pages/ActivityLog.tsx`  
**Lines 119-129 (pills):** Add check: if `entry.change_detail[0]?.field === 'settled_member'`, pill text = `"settled ${entry.change_detail[0].new_value}'s share"`.  
**Lines 145-159 (body text):** Add check: if `entry.change_detail?.[0]?.field === 'settled_member'`, display `"settled {change_detail[0].new_value}'s share of"` instead of `"settled their share of"`. Keep actor label as the bold prefix (the payer performed the action), but the text clarifies whose share.

---

## Fix 5 — DB Migration: Auto-settle solo expenses

**File:** New migration SQL  
**Change:** In `create_expense_with_splits` RPC, after the safety-net payer delete, add:

```sql
IF NOT EXISTS (SELECT 1 FROM expense_splits WHERE expense_id = v_expense_id) THEN
  UPDATE expenses SET is_settled = true WHERE id = v_expense_id;
  v_expense := (SELECT to_jsonb(e.*) FROM expenses e WHERE e.id = v_expense_id);
END IF;
```

---

## Fix 6 — Hide slide-to-settle for 2-person expenses

**File:** `src/components/dashboard/ExpenseDetailSheet.tsx`  
**Line 514:** Change condition from `isPayer && hasUnsettledSplits && !expenseFullySettled` to `isPayer && hasUnsettledSplits && !expenseFullySettled && nonPayerSplits.length > 1`.

---

## Fix 7 — DB Migration: Make settle_my_share idempotent

**File:** New migration SQL  
**Change:** In `settle_my_share` RPC, replace the `IF v_split_settled THEN RAISE EXCEPTION 'Already settled'` block with `IF v_split_settled THEN RETURN jsonb_build_object('success', true); END IF;`.

---

## Implementation Order

Strictly sequential: Fix 1 → confirm → Fix 2 → confirm → Fix 3 → confirm → Fix 4 → confirm → Fix 5 → confirm → Fix 6 → confirm → Fix 7 → confirm.

No colors (red/green) used in any new UI elements. AlertDialogs use existing app tokens only.

