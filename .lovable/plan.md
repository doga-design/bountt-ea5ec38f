

# Root Cause Analysis: Stale Builds and Intermittent Boot Failures

## Ranked Root Causes

### 1. PWA Service Worker Serving Cached Stale Builds (HIGH PROBABILITY)

**Evidence:**
- `vite.config.ts` lines 20-39: VitePWA with `registerType: "autoUpdate"` and Workbox navigation fallback
- `public/manifest.json`: standalone PWA config
- The Workbox default precaching strategy caches all build assets. When new code deploys, the old service worker continues serving cached JS bundles until the new SW activates -- which only happens on the NEXT navigation/reload after download
- `registerType: "autoUpdate"` calls `skipWaiting()` but the old cached responses can still be served from the HTTP cache or Workbox precache until the new SW fully controls the page

**Why this causes stale preview:**
The service worker intercepts all navigation requests and serves cached HTML/JS. Even after a new build deploys, the first load gets the old cached version. The update only takes effect on the second load. In a preview iframe that may not get a hard refresh, this means persistently stale content.

**Fix:**
- Add `skipWaiting: true` and `clientsClaim: true` to the workbox config so new service workers activate immediately
- Add a `cleanupOutdatedCaches: true` option to purge old precache entries
- Consider adding a reload prompt or auto-reload on SW update detection

### 2. Auth Race Condition: Double State Setting (MEDIUM-HIGH PROBABILITY)

**Evidence:**
- `AppContext.tsx` lines 99-145: Both `onAuthStateChange` callback AND `getSession().then()` set `setUser`, `setSession`, `setAuthLoading(false)`, and trigger `fetchGroups`
- The `groupsFetchedForRef` guard prevents double-fetch of groups, but the auth state itself gets set twice in rapid succession
- `onAuthStateChange` fires with `INITIAL_SESSION` event, and then `getSession()` resolves -- both calling `setAuthLoading(false)` and `setUser`
- This causes two render cycles. If the second one arrives slightly late, downstream components (Splash, AuthGuard) may briefly see `user = null` then `user = object`, causing a flash or incorrect redirect

**Why this causes intermittent boot failures:**
- Splash.tsx has a 2200ms timer. If auth resolves quickly (user is null), it navigates to `/auth`. Then `onAuthStateChange` fires with a valid session, but the navigation already happened. User sees auth page despite being logged in.
- Conversely, if `getSession` resolves with a session but `groupsLoading` is still true, the Splash timer keeps waiting. If groups fetch fails silently or takes too long, the user is stuck on splash.

**Fix:**
- Remove the manual `getSession()` call entirely. The `onAuthStateChange` listener with `INITIAL_SESSION` event (added in Supabase JS v2.39+) already handles the initial session. The current code double-processes it.
- Alternatively, use a ref to track whether the initial session has already been processed, and skip the duplicate.

### 3. Splash Timer Race Condition (MEDIUM PROBABILITY)

**Evidence:**
- `Splash.tsx` lines 14-29: A `setTimeout(2200)` gates navigation, but the conditions inside check `authLoading`, `groupsLoading`, `user`, and `userGroups`
- The timer fires once after 2200ms. If `groupsLoading` is still `true` at that moment, none of the navigation branches execute, and the user is permanently stuck on the splash screen
- There is no fallback or retry. If the timeout fires while data is loading, the app never navigates

**Why this causes app failing to boot:**
User opens app -> splash shows -> 2200ms later, groups are still loading from the database -> none of the if/else branches match -> splash stays forever. The `useEffect` dependency array includes `groupsLoading` and `userGroups`, so when those eventually update, the effect re-runs and sets ANOTHER 2200ms timer. But by then the user may have already force-refreshed or assumed it's broken.

**Fix:**
- Separate the splash animation delay from the navigation logic. Show splash for 2200ms, then wait for data to be ready (with a max timeout), then navigate.
- Or: Remove the fixed timer entirely and navigate as soon as `authLoading === false && groupsLoading === false`.

### 4. Stale Closure in Realtime Splits Handler (LOW-MEDIUM)

**Evidence:**
- `AppContext.tsx` line 483: `expenses.some((e) => e.id === expenseId)` captures a stale `expenses` array from closure, then line 485 has `|| true` which bypasses the check entirely
- This means every single realtime event on `expense_splits` triggers `fetchExpenseSplits` AND `fetchExpenses` for the current group, regardless of relevance
- This creates unnecessary API calls that can slow boot and cause state churn

**Fix:**
- Remove the `|| true` bypass or move the check into the callback properly using a ref

---

## Exact Fix Steps

### Fix 1: Service Worker Config (vite.config.ts)
Add `skipWaiting`, `clientsClaim`, and `cleanupOutdatedCaches` to the workbox config:
```js
workbox: {
  navigateFallbackDenylist: [/^\/~oauth/],
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
}
```

### Fix 2: Eliminate Auth Double-Processing (AppContext.tsx)
Remove the `supabase.auth.getSession()` block (lines 129-142). The `onAuthStateChange` listener already fires with the initial session via the `INITIAL_SESSION` event. This eliminates the race condition.

### Fix 3: Fix Splash Navigation Logic (Splash.tsx)
Replace the single-fire timer with a two-phase approach:
- Phase 1: Show splash for minimum 2200ms (animation)
- Phase 2: Once both `authLoading === false` AND `groupsLoading === false` AND minimum time has passed, navigate immediately

```tsx
const [minTimePassed, setMinTimePassed] = useState(false);

useEffect(() => {
  const timer = setTimeout(() => setMinTimePassed(true), 2200);
  return () => clearTimeout(timer);
}, []);

useEffect(() => {
  if (!minTimePassed || authLoading) return;
  if (user) {
    if (groupsLoading) return; // wait for groups
    if (userGroups.length > 0) {
      navigate(`/dashboard/${userGroups[0].id}`, { replace: true });
    } else {
      navigate("/groups/empty", { replace: true });
    }
  } else {
    navigate("/auth", { replace: true });
  }
}, [minTimePassed, authLoading, user, groupsLoading, userGroups]);
```

### Fix 4: Clean Up Stale Closure (AppContext.tsx)
Remove `|| true` on line 485 of the splits realtime handler, or replace the `expenses.some()` check with a ref-based check.

---

## Preventative Safeguards

1. Add a global loading timeout (e.g. 10s) that shows an error state if the app hasn't finished booting
2. Add `console.warn` logging for auth state transitions in development mode to catch future race conditions
3. Consider adding a "New version available" toast using the PWA update lifecycle instead of silent auto-update

