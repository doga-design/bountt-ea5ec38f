

# Bug Fixes and Improvements -- Implementation Plan

## Phase 1: Critical Fixes

### BUG 6: Persistent Authentication
**Status:** Already working correctly.
The auth setup in `AppContext.tsx` (lines 91-130) already calls `onAuthStateChange` first, then `getSession()`. Supabase handles session persistence via localStorage automatically. However, the Splash page (`Splash.tsx`) has a 2200ms delay timer that may cause issues if auth resolves slowly. No code changes needed here -- this should already work. Will verify during testing.

### BUG 3: Join via Invite Code Not Working
**Status:** Already working.
The `/join` route exists in `App.tsx`, and the `Join.tsx` page has a form with a code input and validation. The Auth page links to `/join` with the text "I have a group invite code". The join page handles both URL params and manual code entry. However, the join page requires authentication (`AuthGuard` wraps it). If a user is not logged in and clicks the link on the auth page, they'll be redirected to `/auth` by the guard -- but they're already on `/auth`. This creates a loop for unauthenticated users.

**Fix:** Move the `/join` route outside of `AuthGuard` OR handle the auth-first flow inside Join.tsx (redirect to auth, then back to join after login). The simplest fix: keep the guard but store the invite code. The current code already has `state={{ from: location.pathname }}` in AuthGuard, so after login the user should be redirected back. However, `Auth.tsx` doesn't read `location.state.from`. Need to fix the post-login redirect in Auth.tsx to check for a `from` state.

**Files:** `src/pages/Auth.tsx` -- after successful sign-in, check `location.state?.from` and navigate there instead of the default dashboard redirect.

### BUG 5: Member Count Doesn't Update After User Leaves
**Root cause:** `fetchGroups` filters by `user_id` in `group_members` but doesn't filter by `status='active'`. Also, `fetchMembers` fetches ALL members regardless of status. The member count in `GroupSettings.tsx` line 48 already filters by `status === "active"` -- that's correct. But `DashboardHeader.tsx` line 17 also filters by `status === "active"`. The issue is likely that after `leaveGroup` is called, the `groupMembers` state doesn't update because the member's status is changed in the DB but the local state may not reflect it if the realtime subscription doesn't fire or the user navigates away.

**Fix:** In `leaveGroup` (AppContext line 361-378), after updating the member status, also update `groupMembers` state to reflect the change (set the member's status to "left"). Currently it only removes the group from `userGroups` and clears `currentGroup`, but doesn't update `groupMembers`. Also, `fetchGroups` should filter out groups where the user's membership status is "left".

**Files:** `src/contexts/AppContext.tsx` -- update `fetchGroups` to join with `group_members` and filter `status = 'active'`, and update `leaveGroup` to also update local `groupMembers` state.

### BUG 4: Expense Description Not Editable
**Root cause:** `ExpenseSheet.tsx` line 73 hardcodes `description: "Quick Expense"`.

**Fix:** Add a text input state for description. Place it between the amount display and the numpad. Default to empty, auto-fill "Quick Expense" on submit if empty.

**Files:** `src/components/dashboard/ExpenseSheet.tsx` -- add `description` state, render text input, use it in the insert call.

---

## Phase 2: High Priority

### BUG 1: Banner Gradient Not Updating on Dashboard
**Root cause:** The `DashboardHeader` uses a hardcoded `bg-primary` (line 22) instead of reading `currentGroup.banner_gradient`. When the gradient is changed in settings, `updateGroup` correctly updates `currentGroup` state, but the header never reads the gradient value.

**Fix:** Update `DashboardHeader.tsx` to read `currentGroup.banner_gradient` and apply the gradient as an inline style, using the same `GRADIENTS` map from `GroupBanner.tsx`.

**Files:** `src/components/dashboard/DashboardHeader.tsx` -- import GRADIENTS map, apply dynamic background style.

### FEATURE 7: Empty Groups State
**Current behavior:** Splash page redirects to `/onboarding/group-name` if user has no groups. This is wrong for returning users who left all groups.

**Fix:** Create a new page `/groups/empty` with two CTAs: "Create New Group" and "Join via Invite Code". Update Splash.tsx redirect logic: if user has 0 groups, go to `/groups/empty` instead of onboarding.

**Files:**
- New: `src/pages/EmptyGroups.tsx` -- simple page with two buttons
- `src/pages/Splash.tsx` -- change redirect from `/onboarding/group-name` to `/groups/empty`
- `src/pages/Auth.tsx` -- same redirect change
- `src/App.tsx` -- add route for `/groups/empty`

### BUG 8: Onboarding Shows Again for Returning Users
**Root cause:** Dashboard mode logic (line 70): `mode = !hasOtherMembers ? "empty" : !hasExpenses ? "prompt" : "normal"`. If a returning user opens a group with no expenses yet, they see the "prompt" (onboarding-like) state. This is actually correct behavior -- the "empty" and "prompt" states ARE the onboarding. The real issue is that the Splash page sends returning users to onboarding (`/onboarding/group-name`) if they have no groups.

This is the same fix as FEATURE 7 above. Additionally, the dashboard "empty" state (`EmptyState`) should be for when the user has no other members in the group, which is fine. No additional changes needed beyond FEATURE 7.

---

## Phase 3: Medium Priority

### BUG 2: Placeholder Invite/Merge Flow
This requires multiple changes:

**Step 1: "Invite to Bountt" button in MemberDetailSheet**
Currently the button exists (line 157-159) but does nothing. Wire it to:
- Copy the invite link with `?placeholder=MEMBER_ID` appended
- Show a toast: "Invite link copied! Share it with [name]"

**Step 2: Handle merge on Join page**
- In `Join.tsx`, read `?placeholder=PLACEHOLDER_ID` from URL query params
- After joining the group, if placeholder param exists:
  - Find the placeholder member record
  - Update it: set `user_id = currentUser.id`, `is_placeholder = false`
  - Show confirmation before merging
  - All existing splits with that `member_name` are now linked to the real user

**Step 3: Share flow in SettingsCards**
- When user taps "Share", if group has placeholders, show a selection dialog first
- "Are you inviting one of these people?" with list of placeholder names
- If selected, append `?placeholder=ID` to the share link
- If "Someone new", share generic link

**Files:**
- `src/components/group-settings/MemberDetailSheet.tsx` -- wire Invite button
- `src/pages/Join.tsx` -- handle placeholder merge
- `src/components/group-settings/SettingsCards.tsx` -- enhanced share flow
- `src/lib/bountt-utils.ts` -- add `generatePlaceholderInviteUrl` helper

---

## Implementation Order

1. **ExpenseSheet description input** (BUG 4) -- small, self-contained
2. **DashboardHeader gradient** (BUG 1) -- small, self-contained
3. **Auth redirect fix for /join flow** (BUG 3) -- fix post-login redirect
4. **fetchGroups active filter + leaveGroup state update** (BUG 5)
5. **EmptyGroups page + redirect updates** (FEATURE 7 + BUG 8)
6. **Placeholder invite/merge flow** (BUG 2)

## Technical Notes

- No database migrations needed -- all required columns already exist
- The `fetchGroups` query needs to filter by `status = 'active'` in the `group_members` join to exclude groups the user has left
- The gradient GRADIENTS map should be extracted to a shared utility to avoid duplication between `GroupBanner.tsx` and `DashboardHeader.tsx`
- The placeholder merge only requires updating the existing `group_members` row (set `user_id`, `is_placeholder = false`) -- no expense_splits changes needed since splits reference `member_name` which stays the same, but the `user_id` field in splits should also be updated for consistency

