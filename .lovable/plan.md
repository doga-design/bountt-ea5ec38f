

# Security Fixes — Implementation Plan

## Summary

Nine fixes addressing confirmed vulnerabilities. Priority order: 1 critical, 2 high, 6 medium.

---

## Fix 1 — CRITICAL: Block direct INSERT on group_members

**Problem:** INSERT policy is `auth.uid() IS NOT NULL` — anyone can add themselves to any group.

**Complication:** Two client-side flows do direct INSERTs:
- `Join.tsx` line 168: `joinAsNewMember` inserts directly
- `AppContext.tsx` line 237: `addPlaceholderMember` inserts directly

**Solution — 3 parts:**

**A. Create `join_group` RPC** (SECURITY DEFINER) that:
- Takes `p_group_id`, `p_display_name`, `p_avatar_color`
- Checks `auth.uid() IS NOT NULL`
- Checks user is not already an active member
- Inserts into `group_members` with `user_id = auth.uid()`, `is_placeholder = false`
- Returns the new member row

**B. Create `add_placeholder_member` RPC** (SECURITY DEFINER) that:
- Takes `p_group_id`, `p_name`, `p_avatar_color`
- Checks `auth.uid() IS NOT NULL`
- Checks `is_group_member(p_group_id, auth.uid())` — only existing members can add placeholders
- Inserts with `user_id = NULL`, `is_placeholder = true`
- Returns the new member row

**C. Migration:** Change INSERT policy on `group_members` to `false`. Update `Join.tsx` and `AppContext.tsx` to call the new RPCs instead of direct inserts.

---

## Fix 2 — HIGH: Self-role-promotion via UPDATE

**Problem:** "Members can update their own record" UPDATE policy allows changing `role`.

**Solution:** Drop the existing self-update policy. Replace with a restricted policy:
```sql
CREATE POLICY "Members can update own safe fields"
ON group_members FOR UPDATE TO public
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND role = (SELECT gm.role FROM group_members gm WHERE gm.id = group_members.id)
);
```
This ensures the `role` value cannot change via self-update — the WITH CHECK compares the new role against the existing role and rejects if different.

---

## Fix 3 — HIGH: Remove p_created_by from create_expense_with_splits

**Solution:** Modify the RPC to drop `p_created_by` parameter. Use `auth.uid()` directly for `created_by`. Update both client call sites:
- `ExpenseScreen.tsx` line 513: remove `p_created_by`
- `ExpenseSheet.tsx` line 91: remove `p_created_by`

---

## Fix 4 — MEDIUM: Validate p_paid_by_user_id as group member

**Solution:** In `create_expense_with_splits`, after the group membership check, add:
```sql
IF p_paid_by_user_id IS NOT NULL THEN
  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = p_paid_by_user_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Payer must be an active member of this group';
  END IF;
END IF;
```

---

## Fix 5 — MEDIUM: Soft-deleted groups still accessible

**Solution:** Update the SELECT policy on `groups`:
```sql
DROP POLICY "Group members can view groups" ON groups;
CREATE POLICY "Group members can view groups" ON groups FOR SELECT TO public
USING (is_group_member(id, auth.uid()) AND deleted_at IS NULL);
```

---

## Fix 6 — MEDIUM: Any member can update group

**Solution:** Change UPDATE policy on `groups` from `is_group_member(id, auth.uid())` to `auth.uid() = created_by`.

---

## Fix 7 — MEDIUM: log_member_joined callable for any group

**Solution:** Add membership check in the RPC body after auth check:
```sql
IF NOT is_group_member(p_group_id, auth.uid()) THEN
  RAISE EXCEPTION 'Not a member of this group';
END IF;
```

---

## Fix 8 — MEDIUM: Sole admin leave prevention server-side

**Solution:** Add a database trigger on `group_members` BEFORE UPDATE that fires when `status` changes to `'left'`. The trigger checks:
- Is this member the group creator (`groups.created_by = OLD.user_id`)?
- Are there other active non-placeholder members in the group?
- If sole admin with no other active members, raise exception.

This blocks both direct API calls and client-side leave attempts.

---

## Fix 9 — MEDIUM: Invite codes use Math.random()

**Solution:** In `src/lib/bountt-utils.ts`, replace:
```typescript
code += chars[Math.floor(Math.random() * chars.length)];
```
with:
```typescript
const randomValues = crypto.getRandomValues(new Uint32Array(4));
for (let i = 0; i < 4; i++) {
  code += chars[randomValues[i] % chars.length];
}
```

---

## Files Changed

| File | Change |
|------|--------|
| DB migration | Fixes 1-8: RLS policies, 2 new RPCs, RPC updates, trigger |
| `src/pages/Join.tsx` | Fix 1: replace direct insert with `join_group` RPC |
| `src/contexts/AppContext.tsx` | Fix 1: replace direct insert with `add_placeholder_member` RPC |
| `src/components/expense/ExpenseScreen.tsx` | Fix 3: remove `p_created_by` from RPC call |
| `src/components/dashboard/ExpenseSheet.tsx` | Fix 3: remove `p_created_by` from RPC call |
| `src/lib/bountt-utils.ts` | Fix 9: crypto.getRandomValues() |

**Not touched:** Settlement logic, UI behavior, any other components.

