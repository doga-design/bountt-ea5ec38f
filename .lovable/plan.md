

## Remove verifySession — Trust onAuthStateChange

### Problem
`verifySession()` calls `getUser()` on every app open, every sign-in, every 10 minutes, and every background resume. If that network call fails (slow connection, brief outage, network switch), the user is immediately signed out. This causes random kick-outs in production.

### Changes

**1. `src/contexts/AppContext.tsx`**

Delete:
- `isVerified` state (line 24)
- `userRef` ref and its sync effect (lines 27-28)
- `verifySession` function (lines 128-143)
- 10-minute `setInterval` (lines 187-191)
- `visibilitychange` listener (lines 194-200)
- Cleanup for interval and visibility listener (lines 204-205)
- `isVerified` from `clearAllState` (line 124)
- `isVerified` from context value (line 650)
- Session expiry toast that reads `userRef` (lines 163-165)

Simplify `onAuthStateChange` handler (lines 146-184) to:
```
async (event, newSession) => {
  setSession(newSession);
  setUser(newSession?.user ?? null);
  setAuthLoading(false);

  if (newSession?.user) {
    setTimeout(() => fetchProfile(newSession.user.id), 0);
    if (groupsFetchedForRef.current !== newSession.user.id) {
      groupsFetchedForRef.current = newSession.user.id;
      setTimeout(() => fetchGroups(newSession.user.id), 0);
    }
  } else {
    clearAllState();
  }
}
```

Cleanup becomes just `subscription.unsubscribe()`.

**2. `src/components/AuthGuard.tsx`**

Remove `isVerified` from destructure. New logic:
- `authLoading || groupsLoading` → spinner
- `!user` → redirect to `/auth`
- Otherwise → render children

**3. `src/pages/Auth.tsx`**

Remove `await fetchGroups()` on line 73. `onAuthStateChange` handles it.

**4. `src/types/index.ts`**

Remove `isVerified: boolean` from `AppState` (line 108).

**5. No changes to:** Splash.tsx (already doesn't check `isVerified`), Join.tsx, ResetPassword.tsx, migrations, RLS, any other file.

### Why this is safe
Supabase's `onAuthStateChange` already validates the session internally before firing events. `INITIAL_SESSION` restores on app open. `TOKEN_REFRESHED` handles silent renewal. `SIGNED_OUT` fires on refresh token expiry. The only uncovered case is a deleted user whose JWT remains valid for up to 1 hour — acceptable for a friend group expense app.

