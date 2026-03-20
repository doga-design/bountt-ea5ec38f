

## Auth Simplification: Google OAuth Only

### Problem
The app currently has email/password signup, sign-in, forgot password, email confirmation resend, and a dedicated reset-password page. All of this is being removed in favor of a single "Continue with Google" button.

### Changes

**1. Delete `src/pages/ResetPassword.tsx`**
- Remove this file entirely.

**2. Rewrite `src/pages/Auth.tsx`**
- Complete replacement. New file contains:
  - Bountt wordmark at top
  - Tagline: "Split costs with friends. No drama."
  - Single "Continue with Google" button using `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/" })`
  - Terms/Privacy footer text with placeholder links
  - Existing redirect logic (if already signed in → dashboard or /groups/empty) stays
  - No email, password, forgot password, confirmation, or mode-switching state
  - On error: destructive toast

**3. Edit `src/App.tsx`**
- Remove the `import ResetPassword` line
- Remove the `<Route path="/reset-password" ...>` route

**4. No other files change**
- `AppContext.tsx`, `AuthGuard.tsx`, `Splash.tsx`, all group/expense files — untouched
- No `Profile.tsx` exists, so nothing to modify there

### Post-Deploy Manual Steps (flagged, not code)
- Google OAuth provider must be enabled in Lovable Cloud authentication settings
- `@lovable.dev/cloud-auth-js` handles managed Google OAuth automatically — no client ID needed unless user wants custom branding
- `handle_new_user` trigger already reads `raw_user_meta_data->>'full_name'` for display name — works with Google out of the box

