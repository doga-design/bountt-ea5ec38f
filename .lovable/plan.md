
# Fix: Placeholder Merge Fails with RLS Error

## Root Cause

The database logs reveal that all "Failed to join" errors are from an **UPDATE** on `group_members`, not an INSERT. The placeholder merge code in `Join.tsx` correctly finds the placeholder and attempts to update it, but the RLS policies on `group_members` block the UPDATE.

There are 3 UPDATE policies on `group_members`, and while the "claim placeholders" policy should theoretically allow this operation, the interaction between multiple permissive UPDATE policies with defaulted WITH CHECK expressions causes unexpected denial.

## Fix: Use a SECURITY DEFINER Function

Instead of relying on complex RLS policy evaluation for the merge, create a database function that runs with elevated privileges. This is the standard Supabase pattern for operations that span multiple security concerns.

### Step 1: Create `claim_placeholder` database function

A new SQL migration that creates a function `claim_placeholder(p_placeholder_id UUID)`:
- Validates that the placeholder exists, is actually a placeholder (`is_placeholder = true`, `user_id IS NULL`)
- Validates the calling user is authenticated
- Updates the `group_members` row: sets `user_id`, `is_placeholder = false`, updates `name`
- Updates matching `expense_splits` to assign `user_id`
- Returns the group_id so the client can navigate to the dashboard
- Uses `SECURITY DEFINER` to bypass RLS for this specific, validated operation

### Step 2: Update `Join.tsx` merge logic

Replace the direct `.update()` call (lines 66-82) with an RPC call to `claim_placeholder`. This simplifies the client code and guarantees the merge succeeds.

```text
Before (lines 66-82):
  supabase.from("group_members").update({...}).eq("id", placeholderId)
  supabase.from("expense_splits").update({...})

After:
  supabase.rpc("claim_placeholder", { p_placeholder_id: placeholderId })
```

### Files Changed

- **New migration**: Creates `claim_placeholder` function
- **`src/pages/Join.tsx`**: Replace direct UPDATE with RPC call (~10 lines changed)

### Why This Approach

- SECURITY DEFINER functions are the standard Supabase pattern for cross-table atomic operations
- The function validates all inputs server-side, so it's equally secure
- Eliminates the complex multi-policy RLS evaluation that's causing the issue
- Makes the merge atomic (both group_members and expense_splits update together or not at all)
