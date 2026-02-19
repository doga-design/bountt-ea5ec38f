# Task 1: Fix Expense Split Math + Task 2: Group Management

## Task 1: Fix Split Math (Critical Bug)

### Bug 1: Rounding doesn't preserve totals

**File:** `src/components/dashboard/ExpenseSheet.tsx` (line 76)

Current code: `Math.round((numAmount / memberCount) * 100) / 100` assigns same rounded value to every member. For $10 / 3 this produces $3.33 x 3 = $9.99.

**Fix:** Implement cent-distribution algorithm:

- Convert total to cents
- Base share = Math.floor(totalCents / memberCount)
- Remainder = totalCents % memberCount
- First `remainder` members get base + 1 cent, rest get base
- Guarantees splits sum to exact total

### Bug 2: ExpenseCard display logic breaks with 3+ members

**File:** `src/components/dashboard/ExpenseCard.tsx` (lines 16-21)

Current code finds only one "other" split. With 3+ members this is misleading.

**Fix:** Show the current user's net position:

- If you paid: show "Others owe you $X" where X = total - your share
- If someone else paid: show "Your share is $X"

### Bug 3: BalancePill member matching

**File:** `src/components/dashboard/BalancePill.tsx` (line 23)

The matching condition for placeholder members is convoluted. Simplify to match by `user_id` only (the current user always has a user_id, never a placeholder).

**Fix:** Replace line 23 with simply `split.user_id === user?.id`.

---

## Task 2A: "Who Paid?" Selector in ExpenseSheet

### Changes to `src/components/dashboard/ExpenseSheet.tsx`

- Add state `selectedPayer` (defaults to current user)
- After the amount display and before the numpad, render a row of member buttons
- Each button shows the member name (or "You" for current user)
- Selected button highlighted in orange, others grey
- On submit: use `selectedPayer` for `paid_by_user_id` and `paid_by_name`
- Update subtitle from "Splitting equally with [name]" to "Split equally among [count] people"

### Changes to `src/pages/Dashboard.tsx`

- Pass all group members info to ExpenseSheet (already available via useApp)
- Remove `memberName` prop from ExpenseSheet, it will use groupMembers internally

### Changes to `src/components/dashboard/AddExpensePrompt.tsx`

- Update ExpenseSheet usage to match new props

---

## Task 2B: Group Settings Page

### Database Migration

Add columns to support member management and group customization:

```text
-- group_members: add status and left_at
ALTER TABLE group_members ADD COLUMN status text NOT NULL DEFAULT 'active';
ALTER TABLE group_members ADD COLUMN left_at timestamptz;
ALTER TABLE group_members ADD COLUMN role text NOT NULL DEFAULT 'member';

-- groups: add banner_gradient and deleted_at for soft delete
ALTER TABLE groups ADD COLUMN banner_gradient text NOT NULL DEFAULT 'orange-red';
ALTER TABLE groups ADD COLUMN deleted_at timestamptz;

-- RLS: allow group creator to delete members (remove)
CREATE POLICY "Group creator can delete members"
ON group_members FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM groups g
    WHERE g.id = group_members.group_id
    AND g.created_by = auth.uid()
  )
);

-- RLS: allow members to update group name/banner
CREATE POLICY "Group members can update group"
ON groups FOR UPDATE TO authenticated
USING (is_group_member(id, auth.uid()));
-- Drop the old creator-only update policy first
```

### New Files

`**src/pages/GroupSettings.tsx**` -- Main settings page

- Hero banner with gradient background (5 presets)
- Group name overlay (tap to edit inline)
- Members list section
- Settings cards section
- Danger zone section

`**src/components/group-settings/GroupBanner.tsx**`

- 200px gradient hero with group name + emoji
- Tap banner opens GradientPicker modal
- Tap name enables inline editing

`**src/components/group-settings/GradientPicker.tsx**`

- Modal with 5 gradient swatches: orange-red, blue-purple, green-teal, pink-orange, gray-black
- Tap to select, saves to `groups.banner_gradient`

`**src/components/group-settings/MembersList.tsx**`

- 4 sections: Active, Pending, Placeholder, Former
- Each section collapsible
- Former section collapsed by default

`**src/components/group-settings/MemberCard.tsx**`

- Avatar + name + role badge
- Status dot (green=active, yellow=pending, dashed border=placeholder)
- Swipe-to-remove for admins (using CSS transform + touch events, no extra library)
- "Invite" button on placeholder members

`**src/components/group-settings/SettingsCards.tsx**`

- Group Name card (tap to edit)
- Invite Link card (copy/share buttons)
- No currency picker (USD only)

`**src/components/group-settings/DangerZone.tsx**`

- Leave Group button with confirmation dialog
- Delete Group button (admin only) with name-typing confirmation
- Both use AlertDialog from shadcn

### Route Update

`**src/App.tsx**` -- Replace ComingSoon stub at `/groups/:groupId/settings` with the new GroupSettings page.

### DashboardHeader Update

Wire the settings gear button to navigate to `/groups/:groupId/settings`.

### AppContext Additions

- `updateGroup(groupId, updates)` -- update group name/banner
- `removeMember(memberId)` -- set status='left', left_at=now (or delete)
- `leaveGroup(groupId)` -- current user leaves
- `deleteGroup(groupId)` -- soft delete (set deleted_at)

### Types Update

- Add `status`, `left_at`, `role` to `GroupMember` interface
- Add `banner_gradient`, `deleted_at` to `Group` interface

---

## Implementation Order

1. **ExpenseSheet math fix** -- cent-distribution algorithm
2. **ExpenseCard display fix** -- clear share labels for any group size
3. **BalancePill fix** -- simplify user matching
4. **ExpenseSheet "Who paid?" selector** -- member buttons UI
5. **Database migration** -- new columns + policies
6. **GroupSettings page** -- banner, members list, settings cards, danger zone
7. **Wire routing** -- settings gear navigates, App.tsx route update

## Swipe Implementation

Instead of adding `react-swipeable` dependency, implement swipe-to-remove using native touch events (`onTouchStart`, `onTouchMove`, `onTouchEnd`) with CSS `transform: translateX()`. This keeps the bundle small and avoids a new dependency.  


# **Testing Checklist**

**Math Validation:**

- [ ] $0.01 ÷ 2 = $0.00 + $0.01

- [ ] $10.00 ÷ 3 = $3.33 + $3.33 + $3.34

- [ ] $99.99 ÷ 5 = $20.00 + $19.99 + $20.00 + $20.00 + $20.00

- [ ] Balance pill matches manual calculation

- [ ] ExpenseCard shows correct text for 2-person and 3-person splits

**Who Paid Feature:**

- [ ] Can select any member from buttons

- [ ] Can log "Kyle paid $20" when Kyle is placeholder

- [ ] Expense shows "Paid by Kyle" in feed

- [ ] Your share calculated correctly when you didn't pay

**Group Settings:**

- [ ] Settings icon navigates to /groups/:id/settings

- [ ] Can change gradient background

- [ ] Can edit group name inline

- [ ] Member list shows all 4 sections

- [ ] Admin can swipe any member except self

- [ ] Non-admin cannot swipe

- [ ] Removed member appears in Former section

- [ ] Leave Group works with confirmation

- [ ] Delete Group blocked if not admin