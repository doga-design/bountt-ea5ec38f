

## Root Cause: Stale JWT Lets Deleted Users Through

The app trusts cached JWTs without server-side validation. When you deleted all users, the browser still had a valid JWT in localStorage (JWTs live ~1 hour). `onAuthStateChange` fires `INITIAL_SESSION` with this cached token, the app sets `user` from it, `AuthGuard` sees a user → passes them through to `/groups/empty`.

The previous hardening (`else if (event === "SIGNED_OUT")`) made this worse: it ignores null sessions on non-signout events, so even when token refresh eventually fails (because the user no longer exists), the app doesn't clear state.

## Fix

### 1. Validate session on boot (`AppContext.tsx`)
In the `onAuthStateChange` handler, when `INITIAL_SESSION` fires with a session, call `supabase.auth.getUser()` to verify the user still exists server-side. If it returns an error → call `signOut()` to clear the invalid session from storage and trigger `clearAllState()`.

### 2. Handle null sessions on non-signout events (`AppContext.tsx`)
Remove the `event === "SIGNED_OUT"` gate on `clearAllState()`. If the session is null for ANY reason (failed token refresh, deleted user, revoked session), clear state and redirect. The previous "resilience" optimization was wrong — a null session means the user is not authenticated, period.

### 3. No other files change
- `AuthGuard.tsx` — already correct, checks `user`
- `Splash.tsx` — already correct, checks `user`
- `Auth.tsx` — already correct
- No database changes needed

### Files changed
- `src/contexts/AppContext.tsx` — two changes in the `onAuthStateChange` handler

### Technical detail

```text
Current flow (broken):
  INITIAL_SESSION + cached JWT → setUser(user) → AuthGuard passes → /groups/empty
  Token refresh fails → null session, not SIGNED_OUT → state NOT cleared → user stays in

Fixed flow:
  INITIAL_SESSION + cached JWT → setUser(user) → getUser() validates server-side
    → user deleted? → signOut() → clearAllState() → redirect to /auth
    → user valid? → proceed normally
  Any null session → clearAllState() → redirect to /auth
```

