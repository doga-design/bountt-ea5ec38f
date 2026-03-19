# Enforce 6-Member Group Limit

Five steps, executed in order. No expense/settlement/avatar logic changes.

## Step 1 — Database: Validation trigger + RPC guards

**Migration SQL:**

1. Create a `BEFORE INSERT` trigger on `group_members` that counts active members and raises an exception if count >= 6:

```sql
CREATE OR REPLACE FUNCTION public.enforce_group_member_limit()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF (SELECT COUNT(*) FROM group_members WHERE group_id = NEW.group_id AND status = 'active') >= 6 THEN
    RAISE EXCEPTION 'This group is full. Maximum 6 members allowed.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_member_limit
BEFORE INSERT ON public.group_members
FOR EACH ROW EXECUTE FUNCTION public.enforce_group_member_limit();
```

2. Add count check to `join_group` RPC — after the "already a member" check and before the rejoin UPDATE or new INSERT:

```sql
IF (SELECT COUNT(*) FROM group_members WHERE group_id = p_group_id AND status = 'active') >= 6 THEN
  RAISE EXCEPTION 'This group is full. Maximum 6 members allowed.';
END IF;
```

This check goes before the rejoin path too (a left member reactivating increases active count).

3. Add same count check to `add_placeholder_member` RPC — after the `is_group_member` check, before the INSERT.
4. `claim_placeholder` — no changes. Claiming converts an existing active row, count stays the same.

## Step 2 — Client: Join.tsx

Two guard points using fresh data already fetched in the flow:

**Rejoin path (line ~66):** Before the `supabase.from("group_members").update(...)` call, count active members. If >= 6, show toast `"This group is full (6/6 members)"` and return early.

**New member path — `joinAsNewMember` function (line ~155):** The `existingMembers` query at line 157 already fetches active members. Check `existingMembers.length >= 6` before calling the RPC. Same toast and return.

Both checks use the active member data already being queried (for avatar color assignment), so no extra network call needed.

## Step 3 — Client: AppContext.tsx `addPlaceholderMember`

At line ~221, before the duplicate name check, add:

```ts
const activeCount = groupMembers.filter(
  (m) => m.group_id === groupId && m.status === "active"
).length;
if (activeCount >= 6) {
  toast({ title: "Group is full (6/6 members)", variant: "destructive" });
  return null;
}
```

## Step 4 — UI: GroupSettings.tsx

**Line 78:** Change member count from `{activeMembers.length} member(s)` to `{activeMembers.length}/6 members`.

**Lines 89-97:** Conditionally render the Add Member button — hide it entirely when `activeMembers.length >= 6`. Wrap the existing `<button>` in `{activeMembers.length < 6 && (...)}`.

## Step 5 — UI: ExpenseScreen.tsx

The `MemberAvatarGrid` component receives an `onAddMember` prop (line 708). When `activeMembers.length >= 6`, pass `undefined` instead of the handler to hide the add-member shortcut:

```ts
onAddMember={activeMembers.length < 6 ? () => setShowAddMember(true) : undefined}
```

## Edge Cases Handled

- **Grandfathered groups:** Trigger only fires on INSERT, not on existing rows. Groups with 7+ members continue working.
- **Race conditions:** The DB trigger is the single source of truth — even if two users join simultaneously, the trigger prevents a 7th active row.
- **Placeholder claiming:** Not affected — `claim_placeholder` does an UPDATE, not INSERT. Trigger doesn't fire.
- **Rejoin after leaving:** Both RPC and client check active count before reactivation. A left member returning to a full group sees "Group is full."

**Note:** In Step 3, confirm whether `groupMembers` in AppContext is already scoped to the current group or contains all groups. Use the appropriate filter accordingly. Also change the toast variant from destructive to the existing neutral/default toast style — no red colors.

## Files Changed


| File                                       | Change                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| New migration                              | Trigger function + trigger + RPC updates to `join_group` and `add_placeholder_member` |
| `src/pages/Join.tsx`                       | Count guard on rejoin path (line 66) and in `joinAsNewMember` (line 157)              |
| `src/contexts/AppContext.tsx`              | Count guard in `addPlaceholderMember` (~line 221)                                     |
| `src/pages/GroupSettings.tsx`              | Member count display `N/6`, hide Add Member button when full                          |
| `src/components/expense/ExpenseScreen.tsx` | Hide add-member shortcut in grid when full                                            |
