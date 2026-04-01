

## Audit Findings

### Issue 1: Desktop Gate Has Gaps

**Current state:** `DesktopShell` wraps routes via `ProtectedDesktop`, but several protected routes use bare `AuthGuard` without `DesktopShell`:

| Route | Wrapper | Desktop gate? |
|---|---|---|
| `/groups/empty` | `AuthGuard` only | **NO** |
| `/onboarding/group-name` | `AuthGuard` only | **NO** |
| `/onboarding/invite` | `AuthGuard` only | **NO** |
| `/join`, `/join/:inviteCode` | `AuthGuard` only | **NO** |
| `/groups/:groupId/members` | `AuthGuard` only | **NO** |

Additionally, `DesktopShell` initializes `isDesktop` as `false` and only flips it after a `useEffect` runs — meaning on first render, desktop users see the raw mobile children for one frame before the gate activates.

**Root cause of the onboarding bypass:** When a desktop user creates a group, they navigate to `/onboarding/group-name` and `/onboarding/invite` — neither is wrapped in `DesktopShell`, so the mobile-only gate never appears. They can fully use the onboarding flow on desktop.

### Issue 2: Confetti System — Why It Doesn't Fire

The confetti utility functions (`fireMemberAdded`, `fireFirstCost`, `fireFirstSettle`) are correctly defined and `canvas-confetti` is installed. The trigger logic is the problem:

**`fireMemberAdded`** — Called in `ExpenseScreen.tsx` line 892 when a placeholder member is added via the add-member sheet inside the expense drawer. This one likely works but is hard to trigger because it only fires on the first member added *within the expense screen's add-member sub-sheet*, not when members are added through onboarding or group settings.

**`fireFirstCost`** — The flow:
1. `ExpenseScreen` line 580: calls `onFirstExpenseCreated()` if `expenses.length === 0`
2. Dashboard line 289-292: sets `pendingFirstCostRef.current = true`
3. Dashboard line 274-282: when the expense sheet closes (`onOpenChange(false)`), checks `pendingFirstCostRef` and fires `fireFirstCost()`

**The bug:** At line 580, `expenses` comes from `useApp()` context (line 38). But `fetchExpenseSplits` is called on line 578 *before* the check. The `expenses` array is the context state — it may have already been updated by the time this check runs, or more critically, it captures the stale closure value. Since `expenses` was empty before the RPC call, the check `expenses.length === 0` should pass on first expense. This part likely works, but the confetti only fires when the sheet *closes* (line 274). If the sheet closing animation doesn't trigger `onOpenChange(false)` properly, confetti never fires.

**`fireFirstSettle`** — Fires in `handleDetailOpenChange` (line 66-79) when the expense detail sheet closes and `pendingSettlementRef` was set. Need to check where `pendingSettlementRef` gets set:

Looking at the search results, `pendingSettlementRef` is set somewhere in Dashboard.tsx but I didn't see it in the lines I read. The `ExpenseDetailSheet` has a `userDidSettleRef` but the connection back to Dashboard's `pendingSettlementRef` needs verification.

**Most likely root cause for confetti not working:** The confetti canvas is created by `canvas-confetti` as a fixed-position canvas on the document body. If the `DesktopShell` overlay (z-index 100-120) is rendered on top, confetti (z-index 9999) should still show. But the real issue is likely that the trigger conditions are too narrow or the refs reset on re-renders.

---

## Plan

### Step 1: Fix Desktop Gate — Make It Universal and Instant

**File: `src/App.tsx`**
- Wrap ALL authenticated routes (onboarding, join, empty groups, members) with `DesktopShell` — either by using `ProtectedDesktop` or adding `DesktopShell` inside `AuthGuard`
- Create a simpler wrapper: `const Protected = ({ children }) => <AuthGuard><DesktopShell>{children}</DesktopShell></AuthGuard>`
- Apply it to every protected route uniformly

**File: `src/components/layout/DesktopShell.tsx`**
- Initialize `isDesktop` using a synchronous check: `useState(() => window.matchMedia("(min-width: 1024px)").matches)` instead of `false`
- This eliminates the one-frame flash where desktop users see mobile content

### Step 2: Diagnose and Fix Confetti Triggers

**File: `src/pages/Dashboard.tsx`**
- Read the full file to find where `pendingSettlementRef` is set (likely passed as a callback to `ExpenseDetailSheet`)
- Verify the `onOpenChange` callback chain actually fires when sheets close

**File: `src/components/expense/ExpenseScreen.tsx`**  
- The `expenses.length === 0` check at line 580 uses the closure-captured `expenses` from render time. Since the expense was just created via RPC, the context hasn't re-rendered yet, so `expenses` is still the old empty array. This should work. But verify that `onOpenChange(false)` at line 589 actually triggers the Dashboard's close handler where confetti fires.

**Action:** Add a `console.log` or trace to confirm triggers are reached, then fix any broken chain. Most likely the issue is that `onOpenChange(false)` on line 589 calls the sheet's internal close, but the Dashboard's `onOpenChange` handler (line 265-288) may not execute the confetti path because of timing with state updates.

### Dependencies and Order

1. **Step 1 (Desktop gate)** — independent, no risk, pure wrapper changes
2. **Step 2 (Confetti)** — requires reading more of Dashboard.tsx to find the settlement trigger, then fixing the callback chain

### Risk Assessment

- **Desktop gate fix:** Zero risk — just wrapping more routes with the existing component and fixing initial state
- **Confetti fix:** Medium risk — need to trace the full callback chain; may need to restructure when confetti fires relative to sheet animations

