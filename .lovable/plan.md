

# Fix: Placeholder Merge Failing -- Query String Lost During Auth Redirect

## Root Cause (Confirmed)

The bug is a single line in `AuthGuard.tsx` (line 19):

```text
return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
```

This saves ONLY the pathname (`/join/BNTT-XXXX`) but **drops the query string** (`?placeholder=abc123`).

### What happens step-by-step today:

1. User clicks "Invite to Bountt" on Sarah's placeholder card
2. Link is copied: `/join/BNTT-XXXX?placeholder=abc123`
3. Sarah opens the link (not logged in)
4. AuthGuard redirects to `/auth` with `from = "/join/BNTT-XXXX"` -- query string GONE
5. Sarah logs in
6. Auth.tsx redirects to `/join/BNTT-XXXX` -- no `?placeholder` param
7. Join.tsx reads `placeholderId = null`
8. Merge code is skipped entirely
9. Sarah is added as a brand new member
10. Original placeholder remains untouched

## The Fix

### File: `src/components/AuthGuard.tsx` (line 19)

One line change -- preserve the full URL including query string:

```text
// Before:
state={{ from: location.pathname }}

// After:
state={{ from: `${location.pathname}${location.search}` }}
```

This ensures the `?placeholder=abc123` parameter survives the auth redirect round-trip, so when Sarah lands on `/join/BNTT-XXXX?placeholder=abc123` after login, the existing merge logic in Join.tsx correctly finds and merges the placeholder.

### No other code changes needed

The merge logic in `Join.tsx` (lines 55-88) is already correct:
- It reads `placeholderId` from search params
- Looks up the placeholder record by ID, group, and `is_placeholder=true`
- Updates it with the real user's ID and sets `is_placeholder=false`
- Updates expense splits to link to the real user
- Shows a success toast with merge confirmation

The RLS policy "Authenticated users can claim placeholders" also already supports this exact update pattern (`is_placeholder=true AND user_id IS NULL` -> `is_placeholder=false AND user_id=auth.uid()`).

## Post-Fix: Clean Up Duplicate Member

After deploying the fix, the duplicate "Sarah" member created by the failed merge attempt should be manually removed from the database so you can re-test the flow cleanly.

