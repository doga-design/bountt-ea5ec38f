

# Bountt Phase 1 — Production Readiness Audit

---

## Executive Summary

- **Overall Completion: ~45%** for a production-ready Phase 1
- **Critical Blockers: 8**
- **High Priority Items: 12**
- **Estimated Time to Production-Ready: 3-5 days of focused work**

The core onboarding flow (splash, auth, group creation, invite) is functional. However, significant gaps exist in route protection, session persistence across page refreshes, password reset, accessibility, error resilience, and mobile polish.

---

## 1. AUTHENTICATION and USER MANAGEMENT

**Status: 50%**

### Completed
- Email/password signup with email verification (confirmation email sent)
- Email/password sign-in works (200 status confirmed in network logs)
- Google OAuth works via `lovable.auth.signInWithOAuth` (login confirmed in auth logs)
- Session management via `onAuthStateChange` listener set up BEFORE `getSession()` (correct pattern)
- Auto-create profile trigger (`on_auth_user_created`) fires on signup
- Loading state during auth submission (Loader2 spinner)
- Error handling with toast notifications on auth failures

### Partially Implemented
- **Session persistence across refresh**: Session is persisted in localStorage (Supabase default), but after sign-in the user is navigated to `/onboarding/group-name` -- if they refresh, there is no logic to detect "already onboarded" vs "new user" and redirect accordingly. They'll land on group-name again with no group context.
- **Sign-in redirect logic**: After sign-in, user always goes to `/onboarding/group-name` even if they already have groups. Should check for existing groups and redirect to dashboard.

### Not Implemented
- **Password reset/recovery flow**: No "Forgot password?" link, no `/reset-password` page, no call to `resetPasswordForEmail`
- **Auto-logout on token expiration**: No explicit handling. Supabase auto-refreshes tokens, but if refresh fails, there's no UI feedback or redirect to `/auth`
- **Account deletion**: No UI or backend endpoint
- **"Remember me" functionality**: Not implemented (session persists by default via localStorage, so partial coverage)
- **Rate limiting on login attempts**: No client-side throttling; relies entirely on Supabase server-side rate limits
- **Protected routes**: No route guards. Any route is accessible without authentication (e.g., `/onboarding/group-name` accessible without login)

### Bugs Found
- **Auth screen shows "Check your email!" on signup for already-existing user**: The signup endpoint returns 200 for repeated signups (confirmed in network logs: `user_repeated_signup`). User sees "Check your email!" toast but no new email is sent. Confusing UX.
- **Password minLength=6 in HTML but no server enforcement description**: HTML `minLength={6}` but the PRD doesn't specify. Supabase default is 6, which is weak for production.

**Priority: Critical**
**Estimated effort: 1-2 days**

---

## 2. ONBOARDING FLOW

**Status: 65%**

### Screen 0 -- Splash

#### Completed
- Auto-advances after 2.2 seconds
- Logo "bountt." with orange period renders
- Tagline "Shared expenses made simple." displays
- Hand illustration at bottom
- Mobile responsive (max-width 430px container)

#### Not Implemented
- **No fade transition**: Just an instant navigate, no smooth fade/crossfade animation
- **No check for existing session**: Splash always redirects to `/auth` even if user is already logged in. Should check session and redirect to dashboard if authenticated.

### Screen 1 -- Auth

#### Completed
- Email/password fields with validation (required, minLength)
- Google OAuth button works
- Loading spinner during submission
- Error messages via toast
- "I have a group invite code" link navigates to `/join`
- Mode toggle between signup/signin

#### Partially Implemented
- **Form validation**: Only HTML5 required + minLength. No custom validation messages, no inline error display below fields.

#### Not Implemented
- **Cannot navigate back from auth**: No back button. Minor since splash auto-advances.

### Screen 2 -- Group Name

#### Completed
- Text input works with maxLength=50
- Emoji picker opens/closes with 12 emoji options
- Suggestion chips clickable and auto-fill name + emoji
- Continue button disabled when name is empty
- Progress indicator shows step 1 of 2
- Back navigation to `/auth`
- Group data saves to database (confirmed: group created with 201 status)
- Creator auto-added as group_member

#### Bugs Found
- **No redirect if not authenticated**: `useApp().user` is checked in `handleContinue` (redirects to `/auth`), but the page itself renders fully without auth. User can type a group name, click continue, then get bounced.

### Screen 3 -- Invite

#### Completed
- Group code displays in BNTT-XXXX format
- QR code generates using `qrcode.react` with orange color
- Share button uses Web Share API with clipboard fallback
- Copy button copies code with toast confirmation
- Continue button navigates to `/dashboard/:groupId`
- Skip link works (same as continue)
- Back navigation to group-name screen
- Progress dots show step 2 of 2

#### Bugs Found
- **Console warning**: "Function components cannot be given refs" for Invite component (visible in console logs). Doesn't break functionality but indicates React ref issue.
- **Group data loss on refresh**: Group is passed via `location.state`. If user refreshes on `/onboarding/invite`, `location.state` is null and `currentGroup` may also be null, causing redirect back to group-name. User loses progress.

### Screen 4 -- Completion Splash

#### Not Implemented
- No completion/celebration screen exists. After invite, user goes straight to the Coming Soon dashboard page.

### Cross-screen issues

#### Bugs Found
- **Data does NOT persist between screens on refresh**: Group name screen stores nothing in localStorage/URL. Invite screen relies on router state which is lost on refresh.
- **No session-aware routing**: Logged-out user can access `/onboarding/group-name` directly.

**Priority: Critical (route protection, session handling) / High (transitions, completion screen)**
**Estimated effort: 1-2 days**

---

## 3. DATABASE SCHEMA and DATA INTEGRITY

**Status: 75%**

### Completed
- All 6 tables exist: `profiles`, `groups`, `group_members`, `expenses`, `expense_splits`, `smart_match_dismissals`
- Column types correct (UUID, text, numeric, boolean, timestamptz, date)
- Foreign keys properly set up:
  - `group_members.group_id` -> `groups`
  - `expenses.group_id` -> `groups`
  - `expense_splits.expense_id` -> `expenses`
  - `smart_match_dismissals.group_id` -> `groups`
  - `smart_match_dismissals.expense_id_1` -> `expenses`
  - `smart_match_dismissals.expense_id_2` -> `expenses`
- UNIQUE constraint on `groups.invite_code`
- UNIQUE constraint on `profiles.user_id`
- Default values set (`gen_random_uuid()`, `now()`, `false`, `CURRENT_DATE`, `'🏅'`)
- NOT NULL constraints on all key columns
- `updated_at` triggers on `profiles`, `groups`, `expenses`
- `handle_new_user` trigger on `auth.users` creates profile on signup
- RLS enabled on all 6 tables
- `is_group_member` security definer function prevents infinite recursion
- All RLS policies use the helper function correctly

### Partially Implemented
- **Indexes**: Only primary keys and the unique constraints have indexes. Missing performance indexes on:
  - `group_members.group_id` (frequently filtered)
  - `group_members.user_id` (used in RLS function)
  - `expenses.group_id` (frequently filtered)
  - `expense_splits.expense_id` (frequently joined)
- **Foreign keys to auth.users**: `profiles.user_id`, `groups.created_by`, `expenses.created_by`, `expenses.paid_by_user_id`, `group_members.user_id`, `smart_match_dismissals.dismissed_by` -- none have explicit FK constraints to auth.users. This is technically correct (can't FK to auth schema from public), but means no cascade delete when a user is removed from auth.

### Not Implemented
- **Database-level validation**: No check on invite code format, amount positivity, group name length, or future dates. All validation is client-side only.
- **Cascade delete rules**: When a group is deleted, members/expenses should cascade. Not verified in current schema (FK constraints exist but ON DELETE behavior unclear).

### Bugs Found
- **RLS policies use `RESTRICTIVE` (Permissive: No)**: All policies are restrictive, meaning ALL must pass for access. This is correct for single-policy-per-operation tables, but could cause issues if additional permissive policies are added later without understanding this.

**Priority: Medium (indexes) / Low (database validation)**
**Estimated effort: 0.5 days**

---

## 4. STATE MANAGEMENT

**Status: 80%**

### Completed
- AppContext provider wraps entire app
- All required state variables: `user`, `session`, `profile`, `authLoading`, `currentGroup`, `userGroups`, `groupsLoading`, `groupMembers`, `membersLoading`, `expenses`, `expensesLoading`, `error`
- All required functions: `setCurrentGroup`, `fetchGroups`, `createGroup`, `fetchMembers`, `addPlaceholderMember`, `fetchExpenses`, `addExpense`, `calculateBalances`, `signOut`
- Proper TypeScript types in `src/types/index.ts`
- Real-time subscriptions set up for `expenses` and `group_members` tables, filtered by `currentGroup.id`
- Subscriptions handle INSERT, UPDATE, DELETE events
- Subscriptions clean up on unmount and group change
- `useCallback` used for memoization on key functions

### Partially Implemented
- **Error display**: `error` state is set but never displayed in any UI component. Errors are only shown via toast in individual page components.
- **fetchGroups not called automatically**: After auth, `fetchGroups` is never triggered. Groups are only populated when `createGroup` is called. Returning users who already have groups won't see them.

### Not Implemented
- **Loading state preventing race conditions**: No debouncing or request cancellation. Rapid navigation could cause stale state updates.

**Priority: High (`fetchGroups` on auth)**
**Estimated effort: 0.5 days**

---

## 5. ROUTING and NAVIGATION

**Status: 70%**

### Completed
- All required routes exist:
  - `/` (Splash), `/auth`, `/onboarding/group-name`, `/onboarding/invite`
  - `/join`, `/join/:inviteCode`
  - `/dashboard/:groupId`, `/groups`, `/groups/:groupId/members`, `/groups/:groupId/settings`
- 404 page exists for invalid routes
- Route parameters extract correctly (`:groupId`, `:inviteCode`)
- Browser back/forward navigation works for basic flow

### Not Implemented
- **Protected routes**: No auth guards. ALL routes accessible without login.
- **Auth-aware redirects**: `/` always goes to `/auth`. Should go to dashboard if logged in.
- **`/onboarding/complete` route**: Listed in requirements but doesn't exist.
- **Deep link handling for auth callback**: After email verification, user lands on origin with hash fragment. No explicit handling of the auth callback redirect.

**Priority: Critical (route protection)**
**Estimated effort: 0.5 days**

---

## 6. COMPONENT LIBRARY

**Status: 60%**

### Completed
- Shadcn/ui components installed: Button, Input, Card, Dialog, Sheet, Toast, Tabs, Progress, Skeleton, and 30+ more
- Toast notifications working (via `useToast` hook)
- Loading spinner (Loader2 from lucide-react)

### Partially Implemented
- **Custom Bountt components**: The app uses inline Tailwind classes on raw HTML elements (buttons, inputs) rather than the installed shadcn components. No custom Bountt-branded component wrappers exist. The shadcn `Button`, `Input`, `Card` components are available but unused in onboarding pages.

### Not Implemented
- **Bountt-specific reusable components**: No `BounttButton`, `BounttInput`, `BounttCard`, `ProgressDots`, `PillBadge`, or `EmptyState` components. Each page re-implements these patterns with inline styles.
- **Accessibility on custom elements**: Raw `<button>` and `<input>` elements lack ARIA labels, especially icon-only buttons (emoji picker, share, copy, nav arrows).

**Priority: Medium**
**Estimated effort: 1 day**

---

## 7. UTILITY FUNCTIONS

**Status: 85%**

### Completed
- `generateInviteCode()` -> `BNTT-XXXX` format (excludes confusing chars 0,O,1,I)
- `generateJoinUrl(inviteCode)` -> full URL
- `formatCurrency(amount)` -> `$42.50` format using Intl.NumberFormat
- `formatRelativeDate(dateStr)` -> "Today", "Yesterday", "Last Week", "2 Weeks Ago", or "Jan 15"
- `validateExpenseAmount(value)` -> boolean with proper checks
- `calculateNetBalance(expenses, userId)` -> number
- `calculateBalances(expenses)` -> BalanceSummary[]
- `detectSmartMatch(expense1, expense2, thresholdPercent)` -> SmartMatchSuggestion | null
- All functions have proper TypeScript types
- Edge cases handled in validateExpenseAmount (NaN, negative, >999999.99, decimal places)

### Bugs Found
- **`calculateNetBalance` only adds amounts for payer**: Doesn't subtract the payer's share of expenses they didn't pay. Only tracks "how much they paid total" not actual net balance. This is noted as a stub but the function name is misleading.
- **`generateInviteCode` has no uniqueness guarantee**: Generates random 4-char codes client-side. Two users could generate the same code simultaneously. The UNIQUE constraint on `groups.invite_code` will catch this with a DB error, but there's no retry logic.

**Priority: Low (Phase 2 will flesh out balance calc)**
**Estimated effort: 0.25 days**

---

## 8. ERROR HANDLING and USER FEEDBACK

**Status: 45%**

### Completed
- Toast notifications on auth errors, group creation failure, join failures
- Loading spinners during async operations (auth submit, group creation)
- Success toasts on code copy, group join

### Not Implemented
- **Network failure handling**: No offline detection, no cached data, no retry logic
- **Inline validation errors**: All errors shown as toasts, not inline below fields
- **Double-submit prevention**: Loading state disables button, but no debounce on rapid clicks
- **Global error boundary**: No React error boundary component. Unhandled errors crash the app.
- **Console errors visible**: Multiple "Function components cannot be given refs" warnings in console (Dashboard, Invite, ComingSoon components)

**Priority: High (error boundary) / Medium (inline validation)**
**Estimated effort: 1 day**

---

## 9. SECURITY AUDIT

**Status: 65%**

### Completed
- Passwords hashed by Supabase (server-side)
- RLS enabled on all 6 tables with correct policies
- `is_group_member` security definer function prevents recursion
- API anon key used (publishable, not secret)
- Parameterized queries via Supabase JS SDK (no raw SQL in frontend)
- Users can only view groups/expenses/members they belong to

### Partially Implemented
- **Input sanitization**: `maxLength={50}` on group name, `maxLength={9}` on invite code. But no server-side validation of these limits.
- **XSS**: No `dangerouslySetInnerHTML` usage (good), but emoji and group names are rendered directly without sanitization.

### Not Implemented
- **CSRF protection**: Not explicitly configured (Supabase handles via JWT)
- **Password requirements**: Only `minLength={6}` in HTML. No uppercase/number/symbol requirements. Weak for production.
- **Rate limiting**: No client-side rate limiting on login form
- **Sensitive data in console**: `console.error` in NotFound logs the attempted route, which is fine but there's no global log filtering

### Bugs Found
- **Join page allows group lookup without being a member**: The `/join` page queries `groups` by invite_code. The RLS SELECT policy requires `created_by = auth.uid() OR is_group_member(id, auth.uid())`. This means a non-member CANNOT look up a group by invite code to join it. The join flow is broken for non-creators.

**Priority: Critical (join flow RLS bug)**
**Estimated effort: 0.5 days**

---

## 10. PERFORMANCE

**Status: 70%**

### Completed
- Vite bundler with tree-shaking
- Supabase queries return only needed columns (`select("*")` could be narrowed but acceptable)
- No N+1 query patterns in current code
- Images: splash hand asset used as static import

### Not Implemented
- **Lazy loading for routes**: All pages eagerly loaded in App.tsx
- **Code splitting**: No `React.lazy()` or dynamic imports
- **Image optimization**: Splash hand PNG not optimized (no WebP/AVIF)
- **Font optimization**: System font stack used (good, no external font loading)
- **Memoization**: `useCallback` on context functions but no `React.memo` on components
- **Debouncing**: No debounce on group name input

**Priority: Low (app is small enough that these don't matter yet)**
**Estimated effort: 0.5 days**

---

## 11. MOBILE RESPONSIVENESS

**Status: 60%**

### Completed
- `max-width: 430px` container on `#root` (mobile-first)
- `min-height: 100svh` on screen-container (handles mobile viewport)
- Touch-friendly button sizes (py-4 = ~56px height on CTA buttons)
- Scrollable chip suggestions with hidden scrollbar

### Partially Implemented
- **Input font size**: Inputs use `text-base` (16px) which prevents iOS zoom on focus (good)
- **Tap targets**: Nav arrow buttons are `w-10 h-10` (40px) which is below the 44px minimum
- **iPad/desktop**: Content is centered in 430px container but surrounding area is just background color. No graceful desktop layout.

### Not Implemented
- **PWA manifest**: No `manifest.json`, no service worker, no offline support
- **Home screen icons**: No PWA icons configured
- **Keyboard handling**: No explicit handling of keyboard appearance covering inputs

**Priority: Medium (tap targets) / Low (PWA)**
**Estimated effort: 1 day for PWA, 0.25 days for tap targets**

---

## 12. ACCESSIBILITY (WCAG 2.1 AA)

**Status: 25%**

### Completed
- Semantic HTML: `<form>`, `<input>`, `<button>`, `<label>` elements used
- Labels exist on email/password fields (visually displayed)

### Not Implemented
- **Labels not associated with inputs**: `<label>` elements exist but no `htmlFor`/`id` pairing with inputs
- **ARIA labels on icon buttons**: Nav arrows (ChevronLeft/Right), share button, copy button, emoji picker button -- all lack `aria-label`
- **Focus indicators**: No custom focus styles. Default browser focus outlines may be overridden by `outline-none` on inputs
- **Keyboard navigation**: Tab order not tested; emoji picker grid may trap focus
- **Screen reader support**: Progress dots have no accessible description ("step 1 of 2")
- **Color contrast**: Orange (#E8480A) on white -- needs verification but likely passes. White text on orange -- needs verification.
- **Skip navigation**: No skip-to-content link
- **Error announcement**: Toast errors not announced to screen readers

**Priority: High**
**Estimated effort: 1 day**

---

## 13. BROWSER COMPATIBILITY

**Status: 70%**

### Completed
- React 18 + Vite + modern JS -- works on all modern browsers
- CSS custom properties (widely supported)
- `100svh` (supported in all modern browsers since 2023)
- Web Share API with clipboard fallback (graceful degradation)

### Not Implemented
- **No explicit polyfills**: Relies on Vite's default browserslist
- **navigator.clipboard**: May fail in non-HTTPS contexts (localhost dev is fine, production must be HTTPS)
- **No tested browser matrix**: Unknown if tested on Safari, Firefox, Edge

**Priority: Low**
**Estimated effort: 0.25 days**

---

## 14. LEGAL and COMPLIANCE

**Status: 0%**

### Not Implemented
- Privacy Policy page
- Terms of Service page
- Cookie banner
- GDPR data deletion endpoint
- Data export capability
- Consent tracking

**Priority: High (required before public launch)**
**Estimated effort: 1 day**

---

## 15. ANALYTICS and MONITORING

**Status: 0%**

### Not Implemented
- Page view tracking
- Button click tracking
- Form submission tracking
- Error logging/monitoring service
- User journey analytics
- Client-side error boundary with reporting

**Priority: Medium**
**Estimated effort: 0.5-1 day**

---

## 16. DEPLOYMENT and INFRASTRUCTURE

**Status: 60%**

### Completed
- App deployed via Lovable preview URL (HTTPS)
- Supabase project configured with correct env vars
- Google OAuth redirect URLs configured

### Not Implemented
- **Custom domain**: Not configured
- **Published production URL**: Not published yet
- **CDN for assets**: Handled by Lovable hosting

**Priority: Medium (custom domain)**
**Estimated effort: 0.25 days**

---

## 17. USER EXPERIENCE POLISH

**Status: 40%**

### Completed
- Bountt wordmark with serif font and orange period
- Dark pill headers for section titles
- Consistent color palette across screens
- Suggestion chips with selected state
- QR code with brand orange color
- Toast notifications for feedback

### Partially Implemented
- **Button press animations**: No `:active` scale transforms on buttons
- **Page transitions**: No animated transitions between routes (instant navigation)
- **Emoji picker animation**: Has `animate-fade-in` class but it's not defined in tailwind config

### Not Implemented
- **Completion/celebration screen**: Missing entirely
- **Micro-interactions**: No haptic-style feedback, no spring animations
- **Long group name handling**: Input has `maxLength={50}` but display in invite screen could overflow
- **Error message copy**: Error messages show raw Supabase errors (e.g., "User already registered")

### Bugs Found
- **`animate-fade-in` class referenced but not defined**: Used in emoji picker (`animate-fade-in`) but no corresponding keyframe in tailwind config. Animation silently fails.

**Priority: Medium**
**Estimated effort: 1 day**

---

## Prioritized Action Plan

### Phase A: Critical Blockers (must fix before any testing)

1. **Fix Join flow RLS**: Add a SELECT policy on `groups` allowing any authenticated user to look up by `invite_code` (otherwise no one can join via code)
2. **Add route protection**: Create an `AuthGuard` component that redirects to `/auth` if not logged in. Wrap onboarding and dashboard routes.
3. **Add session-aware splash redirect**: If user has an active session, redirect from `/` to dashboard (or groups list) instead of `/auth`
4. **Add sign-in redirect logic**: After sign-in, check if user has existing groups. If yes, go to dashboard. If no, go to onboarding.
5. **Fix data loss on refresh**: Store created group ID in URL params or localStorage so the invite screen survives a page refresh
6. **Add password reset flow**: "Forgot password?" link on auth screen, `/reset-password` page
7. **Add `fetchGroups` on auth**: Trigger `fetchGroups()` when user session is established
8. **Add React error boundary**: Wrap app in error boundary to prevent white-screen crashes

### Phase B: High Priority (before public launch)

1. **Accessibility fixes**: Associate labels with inputs, add ARIA labels to icon buttons, add focus indicators, fix `outline-none` on inputs
2. **Legal pages**: Privacy Policy and Terms of Service (even placeholder versions)
3. **Fix console warnings**: Resolve "Function components cannot be given refs" warnings
4. **Add completion screen**: Brief celebration screen after invite step before dashboard
5. **Inline form validation**: Show errors below fields, not just in toasts
6. **Global error state display**: Show `error` from AppContext somewhere in UI
7. **Stronger password requirements**: Enforce 8+ characters minimum

### Phase C: Medium Priority (first month post-launch)

1. Add database indexes on `group_members.group_id`, `group_members.user_id`, `expenses.group_id`
2. Add invite code collision retry logic in `createGroup`
3. Add page transition animations
4. Build reusable Bountt component wrappers (BounttButton, BounttInput, etc.)
5. Add PWA manifest and icons
6. Fix nav arrow tap targets to 44px minimum
7. Add button press animations (`:active` scale)
8. Add analytics tracking
9. Define `animate-fade-in` keyframe in tailwind config

### Phase D: Nice-to-Have (future improvements)

1. Lazy loading for routes
2. Image optimization (WebP splash asset)
3. Offline support / service worker
4. Account deletion flow
5. Data export for GDPR
6. Cookie consent banner
7. Desktop-friendly layout beyond 430px
8. Debouncing on inputs
9. Dark mode support

---

## Risk Assessment

### What could break in production?
1. **Join flow is broken**: Non-creators cannot look up groups by invite code due to RLS (Critical)
2. **Unprotected routes**: Anyone can access onboarding pages without auth, potentially creating database errors
3. **Invite code collisions**: Random 4-char codes (28^4 = ~614k combinations) could collide with enough users
4. **No error boundary**: Any unhandled JS error crashes the entire app to a white screen

### What user flows are not tested?
- Join group via invite code (likely broken due to RLS)
- Return user sign-in (goes to group-name instead of dashboard)
- Page refresh during onboarding
- Email verification callback redirect
- Password reset (not implemented)

### What edge cases are not handled?
- User signs up, doesn't verify email, tries to sign in
- User creates group, goes back, creates another group (duplicate behavior)
- Very slow network connections (no timeout handling)
- Multiple browser tabs open simultaneously

### What security vulnerabilities exist?
- Join flow RLS prevents legitimate joins (functional bug, not security)
- No rate limiting on auth forms (DoS risk)
- Weak password policy (6 chars minimum)
- No server-side input validation on group names or amounts

