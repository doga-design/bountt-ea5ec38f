## Two Bug Fixes: Post-Claim Fetch & Admin Leave Transfer

### BUG 1 — Post-placeholder-claim group fetch

**Root cause analysis:** After `claim_placeholder` succeeds (Join.tsx:218-222), `fetchGroups()` is called directly (line 225). `fetchGroups` itself has no guard — it always queries. However, `groupsFetchedForRef.current` is already set to the user's ID from the initial auth flow (AppContext.tsx:167). If `onAuthStateChange` fires again (e.g., token refresh during the claim flow), the guard at line 166 will skip the re-fetch because `groupsFetchedForRef.current === newSession.user.id`.

The `claim_placeholder` RPC correctly writes `auth.uid()` server-side (not client-provided). The membership row will have the correct `user_id` and `status = 'active'`. The issue is that the direct `fetchGroups()` call works, but any subsequent auth event won't re-fetch — and if the direct call's result is overwritten by a stale auth-triggered flow, the group disappears from state.

**Fix:** In Join.tsx `handlePlaceholderSelection`, reset `groupsFetchedForRef.current = null` before calling `fetchGroups()`. This requires either:

- Exposing a `resetGroupsFetched` function from AppContext, or
- Having `fetchGroups` always reset the ref internally when called explicitly

Cleanest approach: Add a `forceRefresh` parameter to `fetchGroups`. When `true`, reset `groupsFetchedForRef.current = null` before proceeding. Call `fetchGroups(true)` from Join.tsx after claim. Also apply this in `joinAsNewMember` and the rejoin path for consistency.

**Files changed:**

- `src/contexts/AppContext.tsx` — Add optional `forceRefresh` param to `fetchGroups`
- `src/types/index.ts` — Update `fetchGroups` signature
- `src/pages/Join.tsx` — Pass `true` to all three `fetchGroups()` calls

---

### BUG 2 — Admin leave dead end → transfer UI

**Current state:** DangerZone.tsx line 45-48 blocks sole admin with a toast and disables the Leave button (line 111). `transfer_group_ownership` RPC exists and works. No client code calls it. No `transferOwnership` function in AppContext.

**Fix — 3 parts:**

**Part A — AppContext: add `transferOwnership` function**

- Call `transfer_group_ownership` RPC with `p_group_id` and `p_new_owner_id`
- On success, refetch groups and members to update local state
- Add to context value and `AppContextValue` type

Before implementing Part A, read the full body of `transfer_group_ownership` RPC and confirm whether `p_new_owner_id` expects `group_members.id` or `user_id`. Pass whichever the RPC actually requires — do not assume.

**Part B — DangerZone.tsx: replace dead-end with member selection**

- Add state: `showTransfer` boolean, `selectedSuccessor` string
- Compute `eligibleMembers`: active, non-placeholder, `user_id !== user.id` members from `groupMembers`
- When sole admin taps Leave Group:
  - If `eligibleMembers.length > 0` → open transfer sheet (`setShowTransfer(true)`)
  - If `eligibleMembers.length === 0` → show message "You're the only real member. Delete the group instead."
- Transfer dialog shows member list with avatars and names
- "Transfer & Leave" button: calls `transferOwnership(group.id, selectedSuccessor)` then `leaveGroup(group.id)` then `navigate("/")`
- Error handling: destructive toast, stay on screen

**Part C — Types update**

- Add `transferOwnership: (groupId: string, newOwnerId: string) => Promise<void>` to `AppContextValue`

**Files changed:**

- `src/contexts/AppContext.tsx` — Add `transferOwnership` function, export in value
- `src/types/index.ts` — Add to `AppContextValue` interface
- `src/components/group-settings/DangerZone.tsx` — Replace dead-end with transfer member selection dialog

**UI approach:** Reuse existing `AlertDialog` pattern already in DangerZone. Member list renders each eligible member with avatar (using existing `getAvatarImage` + avatar color) and name. Radio-style selection. Confirm button disabled until selection made.

---

### What stays the same

All settlement logic, expense creation, realtime subscriptions, auth flows, routing — untouched. No new screens. No DB migrations needed (RPC already exists).