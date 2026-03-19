

## Fix: Verify user existence on session restoration

### Problem
Lines 104-107 in `AppContext.tsx` unconditionally trust the cached session from `onAuthStateChange`. A deleted user's JWT passes signature validation but the user no longer exists in `auth.users`.

### Fix — AppContext.tsx `onAuthStateChange` handler (lines 102-134)

Replace the handler body with this logic:

1. For `INITIAL_SESSION` and `SIGNED_IN` events with a non-null session:
   - **Before** setting `user`, `session`, or calling any fetches, call `supabase.auth.getUser()`
   - If `getUser()` returns an error or no user: call `supabase.auth.signOut({ scope: 'global' })`, clear all state, set `authLoading = false`, return early
   - If valid: proceed with existing flow (set user, session, fetchProfile, fetchGroups)

2. For `TOKEN_REFRESHED`: proceed as-is (Supabase already verified the user server-side during refresh)

3. For `SIGNED_OUT` and all other events: proceed as-is

### Specific code change

In the `onAuthStateChange` callback (lines 104-129), restructure to:

```typescript
async (event, newSession) => {
  // For INITIAL_SESSION and SIGNED_IN, verify user exists server-side
  if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && newSession?.user) {
    const { data: { user: verifiedUser }, error: verifyError } = await supabase.auth.getUser();
    if (verifyError || !verifiedUser) {
      // User deleted or session invalid — sign out immediately
      await supabase.auth.signOut({ scope: 'global' }).catch(() => {});
      setSession(null);
      setUser(null);
      setProfile(null);
      setUserGroups([]);
      setCurrentGroupState(null);
      setExpenses([]);
      setExpenseSplits([]);
      setGroupMembers([]);
      setGroupsLoading(false);
      setAuthLoading(false);
      groupsFetchedForRef.current = null;
      return;
    }
  }

  // Existing flow continues unchanged
  setSession(newSession);
  setUser(newSession?.user ?? null);
  setAuthLoading(false);
  // ... rest of handler unchanged
}
```

### Files touched
Only `src/contexts/AppContext.tsx`. No other files.

### What stays the same
All RLS policies, RPCs, settlement logic, routing, AuthGuard, UI components — untouched.

