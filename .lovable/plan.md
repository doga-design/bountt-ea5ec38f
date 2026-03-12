# Expense Detail Sheet — Full Bug Audit

## Answers to Audit Questions

**Drawer open/close logic:**

1. **What state controls drawer open?** `detailExpenseId` in Dashboard.tsx (line 39). `detailOpen = detailExpenseId !== null` (line 51). Passed as `open` to `ExpenseDetailSheet`.
2. **Where is state set to false (closed)?** Two places: (a) `handleDetailOpenChange(false)` sets `detailExpenseId(null)` (Dashboard line 61). (b) Auto-close effect calls `onOpenChange(false)` (ExpenseDetailSheet line 82), which IS `handleDetailOpenChange`.
3. **Is detailExpense set to null during/after settlement?** Yes — when auto-close fires, `handleDetailOpenChange(false)` sets `detailExpenseId = null`, which makes `detailExpense = null` immediately.
4. **Does drawer close when is_settled becomes true?** Yes — the useEffect at line 75-89.
5. **Is there a useEffect that watches settlement state?** Yes — lines 75-89. This is the source of Bug 1.
6. **When AppContext refetches, does the expense object get replaced?** Yes — both the manual `fetchExpenses` call (line 210/228/244) and the realtime subscription (AppContext line 416-418) replace the expense object in the array. Dashboard derives `detailExpense` from the live array (line 47-49), so the ExpenseDetailSheet always gets the latest object. This is correct.
7. **What is Drawer's open prop bound to?** `<Drawer open={open} onOpenChange={handleClose}>` (line 327). `open` is the prop from Dashboard. `handleClose` is the local wrapper.

**Settlement flow:**

8. **After settle_all resolves:** `fetchExpenses` + `fetchExpenseSplits` are awaited (line 244). This updates `expenses` in AppContext (expense now has `is_settled: true`). Dashboard re-renders, `detailExpense` updates. `expenseFullySettled` becomes `true` in ExpenseDetailSheet. Auto-close effect fires. SIMULTANEOUSLY, realtime subscriptions on `expenses` and `expense_splits` tables also fire, triggering additional refetches (AppContext lines 416-427, 457-476). This is redundant but not harmful.
9. **After settle_my_share:** Same pattern (line 210). May or may not make the full expense settled.
10. **After settle_member_share:** Same pattern (line 228).
11. **Does expense update before or after drawer shows settled state?** The `await` on fetchExpenses ensures the expense is updated before the handler continues. The component re-renders with the new data. ExpenseSettledState renders on the same frame. This is correct.
12. **Race condition between RPC and realtime?** Yes, but harmless — both the manual refetch AND the realtime subscription update the same state. Worst case: double fetch.

**Confetti:**

13. **Where should confetti trigger?** Dashboard.tsx lines 66-74, inside `handleDetailOpenChange`.
14. **What gates it?** `pendingConfettiRef.current === true` (Dashboard line 63).
15. **Is that condition ever true?** **NO — this is Bug 2.** `pendingConfettiRef` is only set by `handleSettlementComplete` (line 54-56), which is passed as `onSettled` to ExpenseDetailSheet. Inside ExpenseDetailSheet, `onSettled?.()` is called in `handleClose` (line 273). But the auto-close effect (line 82) calls `onOpenChange(false)` directly — this goes to Dashboard's `handleDetailOpenChange`, NOT through ExpenseDetailSheet's `handleClose`. Vaul's Drawer does not call its `onOpenChange` callback when the `open` prop changes externally — it just animates closed. So `handleClose` is never invoked during auto-close, and `onSettled` is never called.
16. **Confetti while drawer open?** N/A — it never fires.
17. **Is there a deferred flag?** Yes — `celebratePendingRef` in ExpenseDetailSheet (line 65) and `pendingConfettiRef` in Dashboard (line 44). The bridge between them (`onSettled`) is broken as described above.

**Spoke/Settled swap:**

18. **What condition switches?** `expenseFullySettled` (line 404) — `expense?.is_settled === true`.
19. **Based on what?** The `expense` prop, which is derived from live AppContext data.
20. **Could it cause premature close?** YES — this is Bug 1. See below.

**Slide-to-settle:**

21. **Does it lock correctly?** Yes — `setSlideCompleted(true)` at line 310, then calls `handleSettleAll`.
22. **Snap back on error?** No — `handleSettleAll` catches errors and shows a toast, but `slideCompleted` and `slideX` remain locked. The slider stays at the right edge even on failure. **This is Bug 3.**
23. **setTimeout in slide component?** No setTimeout in the slide logic itself. The only setTimeout is in the auto-close effect (line 81).

**Activity log:**

24. **Query correct?** Yes — filters by `group_id` and `expense_snapshot->>expense_id` (line 155).
25. **Duplicate subscriptions?** The effect depends on `[open, expense?.id, currentGroup?.id]` (line 178) and cleans up on unmount/re-run. No duplicates.

**General:**

26. **Console errors during settlement?** Cannot determine from code alone — no obvious thrown errors, but Bug 3 (slider not resetting) would leave a confusing UI state.
27. **Unhandled promise rejections?** All RPC calls are in try/catch. No unhandled rejections.
28. **TypeScript errors?** None visible in the rebuilt files.

---

## Bug List

### Bug 1: Opening a settled expense triggers auto-close every time

**What is broken:** When a user opens an already-settled expense, the drawer auto-closes after 800ms. They can never view a settled expense.

**File and line:** `ExpenseDetailSheet.tsx`, lines 75-89

**Root cause:** The auto-close effect checks `!prevSettledRef.current` to detect the transition from unsettled→settled. But when the drawer closes, `detailExpenseId` is set to `null` in Dashboard, making `expense` null, making `expenseFullySettled` false. The cleanup branch `if (!open) { prevSettledRef.current = expenseFullySettled }` then resets `prevSettledRef` to `false`. Next time the settled expense is opened, the guard `!prevSettledRef.current` passes, and auto-close fires again. The ref never successfully remembers that the expense was already settled because the expense is nulled on every close.

**Fix:** Track the settled state at *open time*. When the drawer opens, snapshot whether the expense is already settled into a ref. Only trigger auto-close if the expense was NOT settled at open time but IS settled now (a genuine transition). If the expense was already settled when opened, skip auto-close entirely.   
  
(When the drawer opens and the expense is already settled, show ExpenseSettledState immediately — no auto-close, no delay. Auto-close should only ever fire once: when the expense transitions from unsettled to settled within an active open session. Snapshot the settled state at open time using a ref. If already settled on open, skip auto-close entirely.)

### Bug 2: Confetti never fires after settlement

**What is broken:** After full settlement + auto-close, no confetti appears on the feed.

**File and line:** `ExpenseDetailSheet.tsx` line 82 (auto-close path) and lines 268-283 (`handleClose`)

**Root cause:** The auto-close effect calls `onOpenChange(false)` directly (line 82), which goes to Dashboard's `handleDetailOpenChange`. This changes the `open` prop on the Drawer, causing vaul to animate closed — but vaul does NOT call its `onOpenChange` callback (`handleClose`) when the `open` prop changes externally. So `handleClose` is never invoked during auto-close, `onSettled?.()` is never called, and Dashboard's `pendingConfettiRef` is never set to `true`.

**Fix:** Don't rely on `handleClose` being called by vaul. Instead, when the auto-close fires, call `onSettled?.()` directly before or after calling `onOpenChange(false)`. Alternatively, restructure so the auto-close goes through `handleClose` instead of calling `onOpenChange` directly.  
  
(In the auto-close effect, call `onSettled?.()` directly before calling `onOpenChange(false)`. Do not rely on handleClose being invoked by vaul.)

### Bug 3: Slide-to-settle does not reset on RPC error

**What is broken:** If `settle_all` fails (network error, already settled, etc.), the slider stays locked at the right edge. The user cannot retry or dismiss.

**File and line:** `ExpenseDetailSheet.tsx`, lines 238-252 (`handleSettleAll`) and lines 303-316 (`handlePointerUp`)

**Root cause:** `handlePointerUp` sets `slideCompleted = true` and `slideX = maxX` before calling `handleSettleAll`. If the RPC fails, the catch block shows a toast but never resets `slideCompleted` or `slideX`.

**Fix:** In the `catch` block of `handleSettleAll`, reset `slideCompleted` to `false` and `slideX` to `0`. (In the catch block of handleSettleAll, reset slideCompleted to false and slideX to 0 so the user can retry.)

---

## Fix Order

1. **Bug 1 first** — This is the root cause of the loop. Without fixing this, Bug 2's fix won't matter because the drawer behavior is broken.
2. **Bug 2 second** — Depends on Bug 1 being fixed (the auto-close path must work correctly before confetti can fire).
3. **Bug 3 third** — Independent of the other two, but should be fixed in the same pass.