

# Fix: Group Creation RLS Failure

## Root Cause

The `createGroup` function inserts a group row then calls `.select().single()` to get it back. The SELECT RLS policy on `groups` requires `is_group_member(id, auth.uid())`, but the group_members row for the creator hasn't been inserted yet -- that happens AFTER the group insert. So the SELECT fails with an RLS violation.

This is a chicken-and-egg problem: you can't read the group until you're a member, but you can't become a member until the group exists.

## Solution

Create a database RPC `create_group_with_creator` that atomically:
1. Inserts the group
2. Inserts the creator as an admin member
3. Returns the group row

This runs as SECURITY DEFINER so it bypasses RLS internally, and validates `auth.uid()` at the start.

## Changes

### 1. New database migration
- Create RPC `create_group_with_creator(p_name, p_emoji, p_invite_code, p_display_name, p_avatar_color)`
- Inserts group with `created_by = auth.uid()`
- Inserts group_member with role='admin', is_placeholder=false
- Returns the group as JSONB

### 2. Update `src/contexts/AppContext.tsx`
- Replace the two-step insert in `createGroup` with a single `supabase.rpc("create_group_with_creator", {...})` call
- Parse the returned JSONB as the Group object
- Remove the separate member insert

### 3. Update `src/integrations/supabase/types.ts`
- Will auto-update when the migration runs

## Why this is production-ready
- Atomic: group + member created in one transaction (no orphaned groups)
- Secure: validates auth.uid() inside the function
- Consistent: follows the same pattern as `create_expense_with_splits`

