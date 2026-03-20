

## Three Targeted Fixes

### Fix 1 — Close the race window (`AppContext.tsx` line 128-133)
In `onAuthStateChange`, when `newSession?.user` exists, `setAuthLoading(false)` runs on line 126 but `fetchGroups` is deferred via `setTimeout` on line 132. Meanwhile `groupsLoading` could be `false` (set by `clearAllState` on a prior null-session event, line 116). This creates a frame where `authLoading=false`, `groupsLoading=false`, `userGroups=[]` — triggering navigation to `/groups/empty`.

**Change**: Add `setGroupsLoading(true)` synchronously inside the `if (newSession?.user)` block, before the `setTimeout` call. Line 128, right after the opening brace.

### Fix 2 — Allow retry after fetch failure (`AppContext.tsx` line 97)
In `fetchGroups` catch block (line 97), `groupsFetchedForRef` remains set to the user ID, permanently blocking retries. Any subsequent `onAuthStateChange` event skips `fetchGroups` because the ref guard on line 130 sees it's already set.

**Change**: Add `groupsFetchedForRef.current = null` as the first line inside the catch block (before the toast on line 98).

### Fix 3 — Remove dead fetchGroups call (`Auth.tsx` line 73)
`await fetchGroups()` on line 73 runs after `signInWithPassword` but before React commits the new `user` state. `fetchGroups` checks `user?.id` which is still null at this point, making the call a no-op. `onAuthStateChange` handles group fetching.

**Change**: Delete line 73 (`await fetchGroups();`).

