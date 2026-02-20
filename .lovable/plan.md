

# Fix: Placeholder Merge Blocked by RLS Policy

## Root Cause

The merge logic in `Join.tsx` is correct. The problem is a **database security policy** blocking the query.

When Sarah opens the invite link and tries to join:

1. `Join.tsx` line 56: Queries `group_members` to find the placeholder record
2. The SELECT policy on `group_members` requires `is_group_member(group_id, auth.uid())`
3. Sarah is NOT yet a member of the group -- she's trying to join!
4. The query returns `null` (RLS silently filters it out)
5. The merge code is skipped
6. Sarah falls through to "Join as new member" (line 104) -- creating a duplicate

## The Fix

### Step 1: Add a new database SELECT policy on `group_members`

Add a permissive SELECT policy that allows any authenticated user to read placeholder records (needed for claiming):

```sql
CREATE POLICY "Anyone can view placeholders for claiming"
ON group_members FOR SELECT
TO authenticated
USING (is_placeholder = true AND user_id IS NULL);
```

This is safe because:
- Placeholder records contain no sensitive data (just a name like "Sarah")
- They have no `user_id` (it's NULL)
- Once claimed, `is_placeholder` becomes `false` and this policy no longer applies

### Step 2: No code changes needed

The merge logic in `Join.tsx` (lines 55-88) already correctly:
- Reads `placeholderId` from the URL query string
- Looks up the placeholder by ID, group, and `is_placeholder = true`
- Updates it with the real user's ID and sets `is_placeholder = false`
- Updates expense splits to link to the real user

The AuthGuard fix from the previous change also correctly preserves the `?placeholder=ID` query parameter through the auth redirect.

### Step 3: Clean up duplicate Sarah

After deploying, the duplicate "Sarah Edwards" member that was created during failed merge attempts should be removed from the database so you can re-test cleanly.

## Summary

This is a one-line database migration. No application code changes needed.

