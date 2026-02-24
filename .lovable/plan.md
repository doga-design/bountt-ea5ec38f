

# Production Readiness Fix Plan

## Overview
Fix the 5 critical and 6 high-priority issues identified in the audit. The fixes are ordered by severity and dependency.

## Phase 1: Data Integrity (Critical)

### Fix 1: Atomic Expense + Splits via Database RPC
Create a new database function `create_expense_with_splits` that wraps both inserts in a single transaction.

**New migration:**
- Create RPC `create_expense_with_splits(p_group_id, p_amount, p_description, p_paid_by_user_id, p_paid_by_name, p_created_by, p_splits jsonb)` 
- Inserts expense, then inserts all splits from the JSON array, all within one transaction
- Returns the created expense row

**Update `ExpenseSheet.tsx`:**
- Replace the two separate `supabase.from("expenses").insert(...)` and `supabase.from("expense_splits").insert(...)` calls with a single `supabase.rpc("create_expense_with_splits", {...})` call

### Fix 2: Real-Time Sync for Expense Splits
**New migration:**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.expense_splits;
```

**Update `AppContext.tsx`:**
- Add a third real-time channel ref (`splitsChannelRef`)
- Subscribe to `expense_splits` changes filtered by expense IDs in the current group
- Since we can't filter splits by group_id directly (no group_id column on splits), re-fetch all splits whenever an expense INSERT/UPDATE/DELETE event arrives instead

Alternative simpler approach: In the expenses real-time handler, after any INSERT/UPDATE/DELETE, call `fetchExpenseSplits(currentGroup.id)`. This avoids a third subscription and keeps splits always in sync with expenses.

### Fix 3: Enforce Unique Placeholder Names in Database
**New migration:**
```sql
CREATE UNIQUE INDEX idx_unique_active_member_name 
ON group_members (group_id, lower(name)) 
WHERE status = 'active';
```
This prevents duplicate names at the database level regardless of race conditions. The frontend check in `addPlaceholderMember` becomes a nice UX addition but the database is the source of truth.

### Fix 4: Verify/Fix User Deletion Trigger
**New migration:**
- Check if trigger exists on `auth.users`; if not, re-create it
- If the reserved schema prevents it, create an edge function webhook on `auth.users` DELETE events instead

## Phase 2: Error Handling & UX (High Priority)

### Fix 5: Replace `setError` with Toasts Everywhere
**Update `AppContext.tsx`:**
- Import `toast` from `@/hooks/use-toast` (the standalone function, not the hook)
- Replace every `setError(msg)` call with `toast({ title: msg, variant: "destructive" })` 
- Remove the `error` state entirely (or keep for programmatic consumers)
- This ensures users always see feedback when operations fail

### Fix 6: Fix DangerZone Sole-Admin UX
**Update `DangerZone.tsx`:**
- When `isSoleAdmin` is true, disable the Leave confirm button in the AlertDialog (not just the Leave row)
- Show a toast explaining why they can't leave
- Add loading state to both Leave and Delete operations

### Fix 7: Fix ExpenseSheet Payer Index Stability
**Update `ExpenseSheet.tsx`:**
- Add a `useEffect` that resets `selectedPayerIdx` to 0 when `sortedMembers.length` changes
- Add dedup check in the local `setExpenses` call

### Fix 8: Fix GroupSettings Redirect Race
**Update `GroupSettings.tsx`:**
- Add `groupsLoading` to the dependency check, matching the Dashboard pattern:
```
if (groupId && !groupsLoading && !userGroups.find(g => g.id === groupId))
```

### Fix 9: Add Pagination Guard for Splits
**Update `AppContext.tsx` `fetchExpenseSplits`:**
- Instead of fetching expense IDs then splits in two queries, use a single approach:
  - Option A: Create an RPC `get_group_splits(p_group_id)` that joins expenses and splits server-side
  - Option B: Add `.limit(5000)` to the splits query as a safety net
- Option A is preferred for correctness and performance

### Fix 10: Dedup in addExpense
**Update `AppContext.tsx` `addExpense`:**
- Change `setExpenses((prev) => [newExpense, ...prev])` to `setExpenses((prev) => prev.some(e => e.id === newExpense.id) ? prev : [newExpense, ...prev])`

## Phase 3: Cleanup (Medium Priority)

### Fix 11: Remove or Fix `calculateBalances` in bountt-utils
- The function is semantically wrong (sums paid amounts, not net balances accounting for splits)
- Either remove it and the `calculateBalances` context method, or rewrite to use splits like `useHeroData` does

## Files Changed Summary

| File | Action | Fixes |
|------|--------|-------|
| New DB migration | Create | Fixes 1, 2, 3, 4 |
| `src/contexts/AppContext.tsx` | Update | Fixes 2, 5, 9, 10 |
| `src/components/dashboard/ExpenseSheet.tsx` | Update | Fixes 1, 7 |
| `src/components/group-settings/DangerZone.tsx` | Update | Fix 6 |
| `src/pages/GroupSettings.tsx` | Update | Fix 8 |
| `src/lib/bountt-utils.ts` | Update | Fix 11 |

## Technical Notes

- The atomic RPC for expense creation is the highest-value fix -- it prevents the most dangerous failure mode (orphaned expenses with no splits)
- Re-fetching splits on expense real-time events is simpler and more reliable than maintaining a third subscription channel, since splits don't have a `group_id` column for filtering
- The unique index on member names is a database-level safeguard that works regardless of client-side race conditions
- Error surfacing via toasts is a one-time sweep through AppContext that immediately improves UX for all failure paths
