# Fix All Flows Broken by Security Changes

## Root Causes

Three separate breaks from two security fixes:

1. `group_members` INSERT RLS set to `false` → direct `.insert()` calls fail
2. `p_created_by` removed from `create_expense_with_splits` RPC → client calls with old param get 404

## Fixes (4 changes, 3 files)

### Fix A — AppContext.tsx: addPlaceholderMember (line 237-241)

Replace direct `.insert().select().single()` with `supabase.rpc("add_placeholder_member", { p_group_id, p_name, p_avatar_color })`. Parse returned JSONB directly as GroupMember.

### Fix B — Join.tsx: joinAsNewMember (line 168-176)

Replace direct `.insert()` into group_members with `supabase.rpc("join_group", { p_group_id, p_display_name, p_avatar_color })`. The RPC already exists and handles duplicate checks, rejoin, etc.

### Fix C — ExpenseSheet.tsx: remove p_created_by (line 91)

Remove `p_created_by: user.id` from the RPC call. The server now uses `auth.uid()` directly.

### Fix D — ExpenseScreen.tsx: remove p_created_by (line 513)

Same fix — remove `p_created_by: user.id` from the RPC call.  
  
Before implementing Fix B, confirm `join_group` RPC exists in the database by checking migration history or the Supabase function list. If it does not exist, create it in a migration first — takes `p_group_id`, `p_display_name`, `p_avatar_color`, verifies `auth.uid() IS NOT NULL` and user is not already an active member, inserts with `user_id = auth.uid()` and `is_placeholder = false`, returns new member row as JSONB, SECURITY DEFINER.

## Files Changed

- `src/contexts/AppContext.tsx` — lines 237-244
- `src/pages/Join.tsx` — lines 168-178
- `src/components/dashboard/ExpenseSheet.tsx` — line 91
- `src/components/expense/ExpenseScreen.tsx` — line 513

No DB migrations. No RLS changes. No UI changes.