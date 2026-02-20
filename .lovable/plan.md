

# Fix Placeholder Merge Flow

## Root Cause

The merge logic already exists in `Join.tsx` (lines 55-88) but **silently fails** because RLS policies block the database updates:

- **group_members UPDATE**: Only allows updates by group creator (`g.created_by = auth.uid()`) or the member themselves (`auth.uid() = user_id`). A placeholder has `user_id = NULL`, so neither policy matches for the joining user.
- **expense_splits UPDATE**: No UPDATE policy exists at all -- updates are completely blocked.
- **expenses UPDATE**: Only allows updates by the expense creator (`auth.uid() = created_by`). The joining user didn't create the placeholder's expenses.

The code runs, the updates fail silently (Supabase returns empty results on RLS denial), and then it falls through to the normal join flow, creating a duplicate member.

## Fix Overview

### 1. Database Migration: 3 New RLS Policies

**group_members** -- allow claiming unclaimed placeholders:
```sql
CREATE POLICY "Authenticated users can claim placeholders"
ON group_members FOR UPDATE
USING (is_placeholder = true AND user_id IS NULL)
WITH CHECK (is_placeholder = false AND user_id = auth.uid());
```
Safe because: can only update rows where placeholder is unclaimed, result must set your user_id.

**expense_splits** -- allow claiming unclaimed splits (scoped to user's groups):
```sql
CREATE POLICY "Users can claim placeholder splits"
ON expense_splits FOR UPDATE
USING (
  user_id IS NULL
  AND EXISTS (
    SELECT 1 FROM expenses e
    WHERE e.id = expense_splits.expense_id
    AND is_group_member(e.group_id, auth.uid())
  )
)
WITH CHECK (user_id = auth.uid());
```

**expenses** -- allow claiming unclaimed paid_by_user_id:
```sql
CREATE POLICY "Users can claim placeholder expenses"
ON expenses FOR UPDATE
USING (paid_by_user_id IS NULL AND is_group_member(group_id, auth.uid()))
WITH CHECK (paid_by_user_id = auth.uid());
```

### 2. Rewrite Join.tsx with Confirmation UI + Scoped Merge

Add a two-step flow when `?placeholder=ID` is present:

**Step 1**: After looking up the group, fetch the placeholder record and show a confirmation card:
- "Are you [Name]?" with expense count info
- "Yes, that's me" button triggers merge
- "No, join as new member" button triggers normal join
- If user's display name differs from placeholder name, show a warning note

**Step 2 (Merge path)**: Execute three scoped updates:
1. `group_members`: SET user_id, is_placeholder=false
2. `expense_splits`: Fetch expense IDs for THIS group first, then update only matching splits with `.in('expense_id', groupExpenseIds)`
3. `expenses`: Update paid_by_user_id WHERE paid_by_name matches AND group_id matches

**Step 2 (New member path)**: Normal join flow (existing code).

### 3. Error Handling

If the group_members update fails (RLS denial), throw an error instead of silently falling through. Check the update result and show a toast if merge failed.

## Files Modified

1. **Database migration** -- 3 new RLS policies (group_members, expense_splits, expenses UPDATE)
2. **`src/pages/Join.tsx`** -- Add confirmation UI state, name mismatch warning, scoped merge logic with proper error handling

## Security Validations (in application code)

- Placeholder must exist in the group being joined (already checked: `.eq("group_id", group.id)`)
- Placeholder must be unclaimed (already checked: `.eq("is_placeholder", true)`)
- Expense split updates scoped to group's expense IDs only (new)
- Expense paid_by updates scoped to group_id (new)
- RLS prevents cross-group claims at database level

