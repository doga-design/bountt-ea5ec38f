

# Full User & Member Management Audit -- Findings & Fix Plan

## Summary of Findings

After a thorough code audit, I identified **9 bugs/issues** ranging from critical to minor. Below is the full analysis and a fix plan.

---

## BUG 1 (CRITICAL): Removed/left members still appear in expense numpad

**Location:** `src/components/dashboard/ExpenseSheet.tsx`, line 36  
**Problem:** `sortedMembers` is built from `groupMembers` with no status filter. Removed members (`status='left'`) and former placeholders still appear in the "Who paid?" picker and are included in the split calculation.  
**Impact:** Users can create new expenses assigned to removed members, creating orphaned data.

**Fix:** Filter `groupMembers` to only `status === 'active'` before sorting:
```
const activeMembers = groupMembers.filter(m => m.status === 'active');
const sortedMembers = [...activeMembers].sort(...)
```
Also update the split count on line 86 and member name list on line 141 to use this filtered list.

---

## BUG 2 (HIGH): No duplicate placeholder name prevention

**Location:** `src/contexts/AppContext.tsx`, `addPlaceholderMember` (line 231)  
**Problem:** No check for existing active members with the same name. Two placeholders named "Kyle" can be created, causing ambiguity in the merge flow and expense display.  
**Impact:** `claim_placeholder` RPC matches by `member_name` for expense splits -- duplicate names would cause incorrect split reassignment.

**Fix:** Before inserting, check if an active member with the same name (case-insensitive) already exists in the group:
```
const duplicate = groupMembers.find(
  m => m.group_id === groupId && m.status === 'active' 
    && m.name.toLowerCase() === name.toLowerCase()
);
if (duplicate) {
  toast({ title: "A member with that name already exists" });
  return null;
}
```

---

## BUG 3 (HIGH): Admin can leave group with no successor

**Location:** `src/contexts/AppContext.tsx`, `leaveGroup` (line 374) and `src/components/group-settings/DangerZone.tsx`  
**Problem:** No check for whether the user is the only admin. If the sole admin leaves, the group has no admin and no one can manage it (remove members, delete group).  
**Impact:** Orphaned groups with no administrative control.

**Fix:** In `leaveGroup`, check if user is the only admin among active members. If so, block the action with a toast: "You're the only admin. Promote another member before leaving." Alternatively, auto-promote the longest-standing active member. Also update `DangerZone.tsx` to show a warning or disable the leave button when the user is the sole admin.

---

## BUG 4 (MEDIUM): New member joining doesn't get assigned an avatar_color

**Location:** `src/pages/Join.tsx`, `joinAsNewMember` (line 131)  
**Problem:** When a real user joins via invite code (not claiming a placeholder), the insert does not include `avatar_color`. The member row gets `null` for their color.  
**Impact:** The member renders with a fallback hash color instead of a unique persistent color.

**Fix:** Before inserting, fetch existing member colors for the group and pick an available one:
```
const { data: existingMembers } = await supabase
  .from('group_members')
  .select('avatar_color')
  .eq('group_id', groupId)
  .eq('status', 'active');
const existingColors = existingMembers?.filter(m => m.avatar_color).map(m => m.avatar_color!) ?? [];
const newColor = pickAvailableColor(existingColors);
// Include avatar_color: newColor in the insert
```

---

## BUG 5 (MEDIUM): Rejoining user doesn't restore avatar_color

**Location:** `src/pages/Join.tsx`, line 66-76  
**Problem:** When a user who previously left rejoins (status changed from 'left' back to 'active'), their old `avatar_color` is preserved, which may now collide with a color assigned to someone who joined after they left. No color reassignment happens.  
**Impact:** Potential color collision after rejoin.

**Fix:** On rejoin, fetch current active member colors and reassign if there's a collision:
```
// After updating status to 'active', check color
const { data: activeColors } = await supabase
  .from('group_members').select('avatar_color')
  .eq('group_id', group.id).eq('status', 'active').neq('id', existing.id);
// If collision, pick new color and update
```

---

## BUG 6 (MEDIUM): Balance calculations include left members' splits

**Location:** `src/components/dashboard/slides/useHeroData.ts`, `src/components/dashboard/BalancePill.tsx`  
**Problem:** The hero data hook and balance pill iterate over ALL expense splits regardless of whether the split belongs to an active or left member. If a member leaves, their unpaid debts still show in the current user's balance.  
**Analysis:** This is actually **correct behavior** per the requirements ("Balances preserved" after leaving). However, the hero slide action row (debtsYouOwe) shows debts to members who have left, offering a "Pay [Name]" button for someone no longer in the group.  
**Impact:** Users see "Pay Kyle" for a member who left. Clicking it would try to settle an expense but there's no settlement flow implemented yet, so it's cosmetic for now.

**Fix (minor):** Add a visual indicator on the action row when the payer has left (e.g., gray out the "Pay" button or show "(left)" next to name). No balance logic change needed -- debts should persist.

---

## BUG 7 (MEDIUM): No protection against accessing group after being removed

**Location:** `src/pages/Dashboard.tsx`, `src/pages/GroupSettings.tsx`  
**Problem:** If a user navigates directly to `/dashboard/[groupId]` after being removed, the page relies on `userGroups.find()` to set the current group. Since the removed user's `fetchGroups` filters by `status='active'`, the group won't be in `userGroups`, so `setCurrentGroup` is never called. The page renders with stale data or shows a loading spinner forever.  
**Impact:** No explicit error message. User sees a blank/loading state instead of a clear "You're no longer a member" message.

**Fix:** In Dashboard and GroupSettings, after the `useEffect` that looks up the group, add a fallback: if `groupId` is set but group isn't found in `userGroups` (and groups are done loading), show an error state or redirect:
```
if (groupId && !groupsLoading && !userGroups.find(g => g.id === groupId)) {
  navigate('/');
  toast({ title: "Group not found or you're no longer a member" });
}
```

---

## BUG 8 (LOW): `claim_placeholder` doesn't transfer `paid_by_user_id` on expenses

**Location:** Database function `claim_placeholder`  
**Problem:** The function updates `expense_splits.user_id` and `group_members` fields, but does NOT update `expenses.paid_by_user_id` for expenses where the placeholder was the payer. The `expenses` table still has `paid_by_user_id = NULL` for expenses the placeholder originally paid.  
**Impact:** After claiming, the merged user's expenses show as paid by someone with `null` user_id. Balance calculations that check `paid_by_user_id === userId` will miss these expenses, causing incorrect balances.

**Fix:** Add to the `claim_placeholder` function:
```sql
UPDATE expenses
SET paid_by_user_id = v_user_id,
    paid_by_name = COALESCE(v_display_name, v_placeholder_name)
WHERE group_id = v_group_id
  AND paid_by_name = v_placeholder_name
  AND paid_by_user_id IS NULL;
```

---

## BUG 9 (LOW): No cascade handling on account deletion

**Location:** Database schema  
**Problem:** The `group_members.user_id` has no ON DELETE behavior defined for when a user account is deleted from `auth.users`. The `profiles` table has `ON DELETE CASCADE` via the trigger, but `group_members`, `expenses.paid_by_user_id`, and `expenses.created_by` reference user IDs without foreign keys to `auth.users`.  
**Analysis:** Since there are no foreign keys from these tables to `auth.users`, Postgres won't cascade. If a user deletes their account, their group memberships and expenses remain with dangling `user_id` references. This is actually acceptable (data preservation), but the member status should be set to 'left'.  
**Impact:** Ghost member entries that appear active but link to a deleted user.

**Fix:** Create a database trigger on `auth.users` DELETE that sets all `group_members` records for that user to `status = 'left'`.

---

## Implementation Plan

### File Changes

| File | Action | Fixes |
|------|--------|-------|
| `src/components/dashboard/ExpenseSheet.tsx` | Update | Bug 1 |
| `src/contexts/AppContext.tsx` | Update | Bugs 2, 3 |
| `src/pages/Join.tsx` | Update | Bugs 4, 5 |
| `src/pages/Dashboard.tsx` | Update | Bug 7 |
| `src/pages/GroupSettings.tsx` | Update | Bug 7 |
| `src/components/group-settings/DangerZone.tsx` | Update | Bug 3 |
| Database migration | Create | Bugs 8, 9 |

### Priority Order

1. **Bug 1** -- Numpad showing removed members (data corruption risk)
2. **Bug 8** -- claim_placeholder not transferring paid_by_user_id (incorrect balances)
3. **Bug 3** -- Admin can leave without successor (orphaned groups)
4. **Bug 2** -- Duplicate placeholder names (data ambiguity)
5. **Bug 4** -- Missing avatar_color on join (visual inconsistency)
6. **Bug 7** -- No error state for removed user accessing group (UX gap)
7. **Bug 5** -- Rejoin color collision (minor visual issue)
8. **Bug 9** -- Account deletion cascade (edge case)
9. **Bug 6** -- Left member in action row (cosmetic)

