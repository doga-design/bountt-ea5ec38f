

# Fix: Placeholder Merge Broken Due to Lost Query String

## Root Cause

**One bug, one line.** In `src/components/AuthGuard.tsx` line 19, the redirect to `/auth` only preserves `location.pathname`, dropping `location.search` (query parameters).

Flow that breaks:
1. Sarah clicks invite link: `/join/BNTT-XXXX?placeholder=abc123`
2. AuthGuard redirects to `/auth` with `from = "/join/BNTT-XXXX"` (query string LOST)
3. Sarah logs in, Auth.tsx redirects to `/join/BNTT-XXXX` (no placeholder param)
4. Join.tsx reads `placeholderId = null`, skips merge, inserts Sarah as new member

## Fix

### File: `src/components/AuthGuard.tsx` (line 19)

Change:
```
return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
```
To:
```
return <Navigate to="/auth" state={{ from: `${location.pathname}${location.search}` }} replace />;
```

This preserves the full URL including `?placeholder=abc123` through the auth redirect round-trip.

### Cleanup: Remove duplicate member

After deploying the fix, the duplicate "Sarah" member that was incorrectly added as a new member needs to be removed from the database so you can re-test the merge flow cleanly.

## Verification

After the fix:
1. Click "Invite to Bountt" on a placeholder card -- copies link with `?placeholder=ID`
2. Open that link in an incognito window (unauthenticated)
3. AuthGuard redirects to `/auth` with full URL preserved in state
4. User logs in, Auth.tsx redirects to `/join/BNTT-XXXX?placeholder=ID`
5. Join.tsx reads `placeholderId`, finds the placeholder, runs UPDATE (merge) instead of INSERT
6. Placeholder transforms into real user, all expenses preserved, no duplicate member created

