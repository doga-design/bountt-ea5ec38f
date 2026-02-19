

## Fix: RLS Infinite Recursion + Google OAuth

### Problem
Two database issues and one auth issue are blocking the onboarding flow:

1. **Infinite recursion in RLS policies** -- The `group_members` SELECT policy queries the `group_members` table itself to check if the current user is a member. The `groups` SELECT policy also queries `group_members`. When `createGroup` does `.insert().select().single()`, the returning SELECT triggers these policies in a loop, causing Postgres error `42P17`.

2. **Bug in groups SELECT policy** -- The policy compares `gm.group_id = gm.id` (both from `group_members`) instead of `gm.group_id = groups.id`. This means the policy would never match even without the recursion issue.

3. **Google OAuth not enabled** -- The auth logs show `"provider is not enabled"` when attempting Google sign-in.

### Solution

**Database migration** to drop and recreate the problematic RLS policies:

- **groups SELECT**: Allow if `created_by = auth.uid()` OR user exists in `group_members` (using a security definer helper function to avoid recursion).
- **group_members SELECT**: Use a security definer function `is_group_member(group_id, user_id)` that bypasses RLS to check membership, breaking the self-referencing loop.
- Apply the same pattern to `expenses`, `expense_splits`, and `smart_match_dismissals` SELECT policies that also reference `group_members`.

The security definer function:
```text
CREATE FUNCTION public.is_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id
      AND user_id = p_user_id
  );
$$;
```

Then all policies referencing group_members will call `is_group_member(group_id, auth.uid())` instead of a subquery, which avoids recursion since the function runs with definer privileges (bypassing RLS).

**Google OAuth** -- Enable managed Google OAuth via the configure-auth tool so the "Continue with Google" button works.

### Changes

1. **New database migration** -- Drop all recursive SELECT policies on `groups`, `group_members`, `expenses`, `expense_splits`, `smart_match_dismissals`. Create `is_group_member` function. Recreate policies using that function.
2. **Enable Google OAuth** via the auth configuration tool.
3. No frontend code changes needed -- the existing `createGroup` flow and Google sign-in code will work once the backend is fixed.

### Technical Details

Policies to drop and recreate:
- `groups`: "Members can view their groups" -- replace with `created_by = auth.uid() OR is_group_member(id, auth.uid())`
- `group_members`: "Members can view group members" -- replace with `is_group_member(group_id, auth.uid())`
- `expenses`: "Group members can view expenses" and "Group members can create expenses" -- replace subqueries with `is_group_member(group_id, auth.uid())`
- `expense_splits`: "Group members can view splits" -- replace with join-based subquery using `is_group_member`
- `smart_match_dismissals`: "Group members can view dismissals" -- replace with `is_group_member(group_id, auth.uid())`

