

## Security Hardening — 6 Fixes

### Files touched
- `src/contexts/AppContext.tsx` (Fixes 1, 2, 3)
- `index.html` (Fix 4)
- `src/pages/Auth.tsx` (Fixes 5, 6)

---

### FIX 1 — Global signOut (AppContext.tsx line 147-149)
Change `supabase.auth.signOut()` to `supabase.auth.signOut({ scope: 'global' })`. Revokes refresh token server-side.

### FIX 2 — try/catch on signOut (AppContext.tsx line 147-149)
Wrap the signOut call in try/catch. On failure, show a destructive toast. No state cleanup duplication — `onAuthStateChange` handles that.

### FIX 3 — Clear expenseSplits on SIGNED_OUT (AppContext.tsx line 124-125)
Add `setExpenseSplits([])` between `setExpenses([])` and `setGroupMembers([])` in the SIGNED_OUT cleanup block.

### FIX 4 — Content Security Policy (index.html)
Add a `<meta http-equiv="Content-Security-Policy">` tag in `<head>` with:
- `default-src 'self'`
- `script-src 'self' 'unsafe-inline'` (Vite needs inline scripts)
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
- `font-src 'self' https://fonts.gstatic.com`
- `img-src 'self' data: blob: https://storage.googleapis.com` (OG images reference this domain)
- `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.lovable.dev https://*.lovable.app` (Supabase API + realtime + Lovable OAuth)
- `frame-ancestors 'none'`

### FIX 5 — autocomplete attributes (Auth.tsx)
- Email input: add `autoComplete="email"`
- Password input: add `autoComplete={mode === "signup" ? "new-password" : "current-password"}`
- Forgot-password email input: add `autoComplete="email"`

### FIX 6 — Confirmation email resend (Auth.tsx)
Add state `needsConfirmation` (boolean) and `confirmationEmail` (string). After successful signup with `data.user && !data.session`, set both. Render a "Resend confirmation email" button inline below the form when `needsConfirmation` is true. On tap, call `supabase.auth.resend({ type: 'signup', email: confirmationEmail })`, show success/error toast. Button only appears after an unconfirmed signup — not always visible.

---

### What stays the same
All RLS policies, RPCs, settlement logic, expense logic, realtime subscriptions, routing, and all other files remain untouched.

