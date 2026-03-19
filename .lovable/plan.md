

# Fix: Group Deletion Blocked by RLS

## Root Cause

The `groups` table has:
- **SELECT policy**: `is_group_member(id, auth.uid()) AND (deleted_at IS NULL)`
- **UPDATE policy**: `USING (auth.uid() = created_by)` — no explicit `WITH CHECK`

PostgreSQL combines SELECT and UPDATE policies for UPDATE operations. When no explicit `WITH CHECK` is provided, the USING expression (combined with SELECT policies) is applied to the **new row**. After setting `deleted_at`, the new row fails `deleted_at IS NULL` from the SELECT policy, causing the 403 error.

## Fix

One migration: drop and recreate the UPDATE policy with an **explicit `WITH CHECK`** so the new-row validation only checks ownership, not `deleted_at`:

```sql
DROP POLICY "Group creator can update group" ON groups;
CREATE POLICY "Group creator can update group" ON groups
FOR UPDATE TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);
```

This separates:
- **USING** (which rows can be updated): still requires `auth.uid() = created_by` + row must be visible via SELECT policy
- **WITH CHECK** (what the new row must satisfy): only `auth.uid() = created_by` — no `deleted_at IS NULL` check on the new row

## Secondary fix: Show actual error messages

In `AppContext.tsx` line 353, the catch block uses a generic "Failed to delete group" fallback because `PostgrestError` is not an instance of `Error`. Fix to extract the actual message:

```ts
const msg = (err as any)?.message || "Failed to delete group";
toast({ title: msg, variant: "destructive" });
```

Apply same pattern to other catch blocks that use `err instanceof Error` (updateGroup, removeMember, etc.) so real error messages surface during debugging.

## Files changed

| File | Change |
|------|--------|
| Migration SQL | Recreate UPDATE policy with explicit WITH CHECK |
| `src/contexts/AppContext.tsx` | Improve error message extraction in catch blocks |

