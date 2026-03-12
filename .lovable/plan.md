

# Production-Readiness Audit — Bountt

## CRITICAL BLOCKERS

### ❌ No expense amount validation at DB level
**Files:** `create_expense_with_splits` RPC, `edit_expense` RPC
Negative or zero amounts can be inserted directly via the API. Client-side validation exists (`validateExpenseAmount` in bountt-utils.ts) but RPCs don't enforce `p_amount > 0`. An attacker can call the RPC directly with negative amounts.
**Fix:** Add `IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;` to both RPCs.

### ❌ Split sum not validated server-side
**Files:** `create_expense_with_splits`, `edit_expense` RPCs
No check that split amounts sum to the expense total. A malicious client could submit splits that don't add up.
**Fix:** Add validation in RPCs: `IF abs(v_split_sum - p_amount) > 0.01 THEN RAISE EXCEPTION 'Splits must sum to total'; END IF;`

### ⚠️ `as any` type casts on RPC calls (7 occurrences)
**Files:** `ExpenseDetailSheet.tsx`, `ExpenseScreen.tsx`, `Join.tsx`, `NetBalanceSlide.tsx`
All RPC calls use `as any` to bypass TypeScript. This masks type mismatches and could hide breaking changes if RPC signatures change.
**Fix:** Update the generated types or create proper typed wrappers.

### ⚠️ `expense_splits` realtime not scoped to group
**File:** `AppContext.tsx:457-476`
The splits channel subscribes to ALL `expense_splits` changes globally (no filter). While there's a client-side guard, every split change across all groups triggers the handler. This is a data leak concern — the payload contains split data from other groups that arrives at the client before the guard filters it.
**Fix:** Use the `get_group_splits` RPC pattern, or add a `group_id` column to `expense_splits` for proper server-side filtering.

### ⚠️ `expense_splits` UPDATE policy missing for settlement
**Table:** `expense_splits` RLS
The `settle_my_share` RPC uses SECURITY DEFINER so it bypasses RLS, which is fine. But there's no standard UPDATE policy for authenticated users to settle their own splits — only a policy for claiming placeholders. If any future code tries to settle without the RPC, it will silently fail.
**Status:** Not a current blocker since all settlement goes through RPCs, but fragile.

---

## IMPORTANT (Not Blocking)

### ✅ Email/password auth works end-to-end
Signup, login, logout all implemented in `Auth.tsx`. Email confirmation required (no auto-confirm).

### ✅ Session persistence across refreshes
`supabase` client configured with `persistSession: true`, `autoRefreshToken: true` in `client.ts`.

### ⚠️ Auth state sync across tabs
`onAuthStateChange` handles INITIAL_SESSION, SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED events. However, there's no explicit `BroadcastChannel` or `storage` event listener for cross-tab sync. Supabase JS handles this internally via localStorage events, so it should work, but edge cases exist on Safari.

### ✅ Password reset flow functional
`Auth.tsx` has forgot password form → `resetPasswordForEmail` with correct `redirectTo`. `ResetPassword.tsx` checks for `PASSWORD_RECOVERY` event and URL hash. Properly calls `updateUser({ password })`.

### ✅ No unauthenticated routes expose private data
All data routes wrapped in `AuthGuard`. Public routes: `/`, `/auth`, `/reset-password`. Join routes are behind AuthGuard.

### ✅ RLS enabled on all tables
All 6 tables (`groups`, `expenses`, `expense_splits`, `group_members`, `activity_log`, `profiles`, `smart_match_dismissals`) have RLS enabled with appropriate policies.

### ✅ Users can only read/write their own data
RLS policies use `is_group_member()` SECURITY DEFINER function for group-scoped access. Profiles table restricts to `auth.uid() = user_id`.

### ⚠️ Placeholder users can access some data
Placeholders have `user_id IS NULL`. The `Anyone can view placeholders for claiming` SELECT policy on `group_members` exposes placeholder names to all authenticated users (not just group members). Low risk — only names exposed, but technically over-permissive.

### ✅ JWT tokens — standard handling
Supabase JS stores tokens in localStorage. This is standard for SPAs. No custom token handling.

### ✅ Foreign key constraints enforced
`expense_splits.expense_id → expenses.id ON DELETE CASCADE`, `activity_log.group_id → groups.id`, `expenses.group_id → groups.id`. No orphaned records possible for splits.

### ⚠️ Expenses without group FK enforcement
`expenses.group_id` references `groups.id` via FK. But `expenses.paid_by_user_id` has NO FK to any table — intentionally, to support placeholders. `expenses.created_by` also has no FK. If a user is deleted from auth, their expenses remain but `created_by` points to a non-existent user. The `handle_user_deletion` trigger only marks group_members as left.
**Impact:** Low — expenses still render because they use `paid_by_name` as fallback.

### ✅ Realtime subscriptions for expenses and members are scoped
`expenses` and `group_members` channels use `filter: group_id=eq.${currentGroup.id}`.

### ✅ No secrets hardcoded in client-side code
Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key) in `.env`. Service role key is in Supabase secrets only.

### ✅ Edge functions validate auth
No custom edge functions exist currently — all backend logic is in database RPCs with SECURITY DEFINER and `auth.uid()` checks.

### ✅ Atomic expense operations prevent race conditions
`create_expense_with_splits`, `edit_expense`, `delete_expense` are all single-transaction RPCs. Concurrent edits: `edit_expense` checks `is_settled` before proceeding and deletes/re-inserts splits atomically.

### ⚠️ Settlement race condition possible
Two users calling `settle_my_share` simultaneously on the same expense: both check `is_settled = false`, both proceed. The second UPDATE is a no-op (already settled). The `v_all_settled` check might fire twice, causing duplicate activity log entries. Low risk but not idempotent.

### ✅ Balance calculations
`getMemberBalance` in `avatar-utils.ts` and `useHeroData.ts` both compute from splits. `distributeCents` in `bountt-utils.ts` uses integer-cent math to avoid floating-point drift.

### ✅ Deleted users don't break records
`handle_user_deletion` trigger marks members as left. Expenses use `paid_by_name` as display fallback. `ExpenseFeedItem` renders `payerMember = null` as gray ghost avatar.

### ⚠️ Currency handling — no explicit currency field
All amounts assumed USD. No `currency` column on expenses. Fine for MVP but limits internationalization.

### ✅ Mobile responsive
App uses `screen-container` pattern, Tailwind responsive classes. Touch targets generally adequate (buttons are `py-3`/`py-4` with full width).

### ⚠️ Some touch targets below 44px
Member avatar row uses 56px avatars (good), but the pie chart icon and some label elements may be smaller. The settled split breakdown dots are 12px (`w-3 h-3`).

### ⚠️ No pagination on expenses or activity log
`fetchExpenses` loads all expenses for a group with no limit. `ActivityLog` uses `.limit(100)`. For groups with 1000+ expenses, this will hit the Supabase 1000-row default limit silently.
**Fix:** Add pagination or increase limit with explicit handling.

### ✅ Error boundaries exist
`ErrorBoundary.tsx` wraps the entire app. Shows fallback UI with "Back to Home" button.

### ✅ Loading states exist
Splash screen, Dashboard loading spinner, ActivityLog loading spinner, auth form loading states all present.

### ✅ Empty states exist
`EmptyState` for no members, `AddExpensePrompt` for no expenses, ActivityLog empty state, EmptyGroups page.

### ⚠️ No double-submit prevention on expense creation
`ExpenseScreen` sets `loading = true` during save and checks `if (loading) return`, which prevents double-tap. However, there's a window between the first click and `setLoading(true)` where a second tap could fire. React batching should handle this in most cases.

### ⚠️ Mid-session group removal
If a user is removed from a group while viewing Dashboard, the realtime member UPDATE event fires, `groupMembers` updates, but the user stays on the dashboard until the 500ms redirect timer in the `useEffect` fires. During that window, the UI may show stale data. Acceptable UX.

### ✅ No console.log in production
Search confirmed zero `console.log` statements. Only `console.error` behind `import.meta.env.DEV` guards.

### ⚠️ TODO comment in critical path
`MemberAvatarRow.tsx:39` — `// TODO: filter feed by selected member`. Non-functional feature, cosmetic only.

### ✅ No dead code blocks
Codebase is clean. Old components (`ExpenseCard.tsx`, `MemberCardScroll.tsx`) still exist but are only referenced from `GroupSettings.tsx`.

### ✅ Build environment separation
`.env` has only public keys. Secrets are in Supabase secrets store. `import.meta.env.DEV` guards for dev-only logging.

### ❌ No error logging/observability (Sentry or equivalent)
No crash reporting service integrated. `ErrorBoundary.componentDidCatch` only logs to console in dev mode. In production, errors are completely invisible.
**Impact:** You cannot tell if the app is broken without a user reporting it.

### ⚠️ Dates stored correctly
Expenses use `date` type (date only, no timezone). Timestamps use `timestamp with time zone`. `formatRelativeDate` correctly handles date-only strings. However, date comparison uses local `new Date()` which could shift by a day near midnight in non-UTC timezones.

### ✅ Character encoding
No restrictions on names or descriptions. PostgreSQL text columns handle Unicode and emoji natively.

### ⚠️ XSS — React auto-escapes
All user text rendered via JSX (not `dangerouslySetInnerHTML`). Safe by default.

### ✅ SQL injection — impossible
All queries use Supabase JS client (parameterized) or RPCs with typed parameters.

### ✅ CORS — N/A
No custom edge functions deployed.

### ✅ Auth tokens not in URLs
No tokens passed via URL params. Recovery flow uses hash fragment (handled by Supabase).

---

## NICE-TO-HAVES

- PWA icons only include favicon.ico (64x64). Missing 192px and 512px icons for proper PWA install.
- No offline support despite service worker — app shows blank if network is down.
- `MemberCardScroll.tsx` is still used in `GroupSettings.tsx` but not in Dashboard — consider unifying.
- Activity log limit of 100 with no "load more" pagination.
- No rate limiting confirmation on auth (Supabase handles this by default — confirmed on).

---

## PRIORITY SUMMARY

| Priority | Item | Impact |
|----------|------|--------|
| 🔴 Critical | No server-side amount validation in RPCs | Data integrity — negative/zero expenses possible |
| 🔴 Critical | No server-side split sum validation | Data integrity — splits can diverge from total |
| 🔴 Critical | No error observability (Sentry) | Cannot detect production failures |
| 🟡 Important | `expense_splits` realtime leaks cross-group payloads | Minor data exposure |
| 🟡 Important | No pagination on expenses (1000-row limit) | Silent data loss for large groups |
| 🟡 Important | `as any` casts on 7 RPC calls | Type safety erosion |
| 🟢 Nice-to-have | PWA icons incomplete | Install experience |
| 🟢 Nice-to-have | Date timezone edge case near midnight | Cosmetic date grouping |
| 🟢 Nice-to-have | TODO comment in MemberAvatarRow | Non-functional |

