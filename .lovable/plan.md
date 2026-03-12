

# Bug Assessment: Three Active Bugs in Expense Detail Sheet

## Bug 1: Settled expenses auto-close immediately on open

**Root cause:** `ExpenseDetailSheet.tsx` lines 75-89.

When the drawer closes, `Dashboard.tsx` line 61 sets `detailExpenseId = null`. This makes `detailExpense = null` and `expenseFullySettled = false`. The cleanup branch at line 87 (`if (!open) { prevSettledRef.current = expenseFullySettled }`) then resets the ref to `false`.

Next time the user opens the same settled expense, the effect sees `open && expenseFullySettled && !prevSettledRef.current` → `true && true && !false` → fires auto-close. Every open triggers a close. The ref never remembers the expense was already settled because the expense is nulled between opens.

**Fix:** Snapshot the settled state when the drawer *opens*. Add a `settledAtOpenRef` that captures whether the expense is already settled at open time. Only trigger auto-close if `settledAtOpenRef.current === false` (it was unsettled when opened) AND `expenseFullySettled` is now true. If the expense was already settled when opened, skip auto-close entirely.

**File:** `ExpenseDetailSheet.tsx` lines 74-89.

---

## Bug 2: Confetti never fires

**Root cause:** `ExpenseDetailSheet.tsx` line 82.

The auto-close effect calls `onOpenChange(false)` — this is the **prop** from Dashboard (`handleDetailOpenChange`), which directly sets `detailExpenseId = null`. It bypasses `handleClose` (line 268-283), where `celebratePendingRef` is read and `onSettled?.()` is called.

Vaul's Drawer does NOT call its `onOpenChange` callback when the `open` prop is changed externally by the parent. So `handleClose` never runs during auto-close, `onSettled` is never called, and Dashboard's `pendingConfettiRef` is never set to `true`.

**Fix:** In the auto-close effect (line 79-82), call `onSettled?.()` directly before calling `onOpenChange(false)`. This sets Dashboard's `pendingConfettiRef.current = true` so that when `handleDetailOpenChange(false)` runs, it finds the flag and fires confetti.

**File:** `ExpenseDetailSheet.tsx` line 79-82.

---

## Bug 3: Activity log shows "You Settled Share" instead of member's name

**Root cause:** `ExpenseDetailSheet.tsx` lines 462-473.

For all `settled` actions, the code uses `actorLabel` (line 464: the person who clicked the button, derived from `actor_id`) and a generic `"Settled Share"` label (line 473). When the payer settles Matt's share via `settle_member_share`, the `actor_id` is the payer, so the log shows "You Settled Share".

The member's name IS stored in the database — `settle_member_share` RPC writes `change_detail` with `field: 'settled_member'` and `new_value: v_split.member_name`. But the rendering code ignores `change_detail` for settled actions entirely.

**Fix:** In the settled action branch (line 472), check `log.change_detail?.[0]?.field`:
- If `'settled_member'`: display `"Settled [change_detail[0].new_value]'s Share"` (shows the member name, not the actor)
- If `'settled_by'`: display `actorLabel + " Settled Share"` (member settling their own)
- If `'settled_all'`: display `actorLabel + " Settled All"`

**File:** `ExpenseDetailSheet.tsx` lines 472-473.

---

## Fix Order

1. **Bug 1 first** — the auto-close loop makes settled expenses unusable and blocks testing Bug 2.
2. **Bug 2 second** — depends on auto-close working correctly (Bug 1 fix).
3. **Bug 3 third** — independent rendering fix, no dependencies.

All three fixes are in `ExpenseDetailSheet.tsx`. No database or RPC changes needed.

