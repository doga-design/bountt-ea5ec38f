

## Step 1 — Remove All Confetti Code

### Files to modify

**Delete entirely:**
- `src/components/dashboard/ExpenseSheet.tsx` — orphan file, not imported anywhere, only exists with confetti code

**`src/components/dashboard/EmptyState.tsx`:**
- Remove line 4: `import confetti from "canvas-confetti"`
- Remove lines 20-26: the `confetti({...})` call inside `handleSubmit`. Keep `setName("")` and the rest

**`src/components/dashboard/ExpenseDetailSheet.tsx`:**
- Remove line 23: `onSettled?: () => void` from interface
- Remove line 36: `onSettled` from destructured props
- Remove lines 64-65: `celebratePendingRef` declaration
- Remove lines 73-92: `settledAtOpenRef` ref + both `useEffect` blocks that handle auto-close with confetti. **Keep** the auto-close behavior but remove the `onSettled?.()` call — the auto-close itself is useful UX, just strip the confetti flag
- Remove lines 285-289: `celebratePendingRef` check in `handleClose`, keep the rest of `handleClose`
- Remove `onSettled` from the `useEffect` dependency array (line 93)

**`src/components/expense/ExpenseScreen.tsx`:**
- Remove `isFirstExpense` prop from interface (line 21) and destructuring (line 32)
- Remove `onFirstExpenseSaved` prop from interface (line 26) and destructuring (line 36)
- Remove lines 562-563: the `if (isFirstExpense)` block that calls `onFirstExpenseSaved?.()` and shows special toast. Keep the `else` toast ("Expense added") as the only toast

**`src/pages/Dashboard.tsx`:**
- Remove line 18: `import confetti from "canvas-confetti"`
- Remove lines 52-54: both confetti refs
- Remove lines 63-66: `handleSettlementComplete` callback
- Remove lines 68-77: `fireConfetti` function
- Simplify `handleDetailOpenChange` (lines 80-88): remove confetti ref check, keep `setDetailExpenseId(null)`
- Remove `onSettled={handleSettlementComplete}` prop from ExpenseDetailSheet (line 249)
- Remove `isFirstExpense` and `onFirstExpenseSaved` props from ExpenseScreen (lines 288-290)
- Simplify the `onOpenChange` handler (lines 274-279): remove confetti ref check, keep the rest

**`package.json`:**
- Remove `"canvas-confetti": "^1.9.4"` from dependencies

### Verification after step 1
- Zero references to `canvas-confetti`, `confetti`, `pendingConfettiRef`, `pendingFirstExpenseConfettiRef`, `celebratePendingRef`, `fireConfetti`, `onSettled`, `onFirstExpenseSaved`, `isFirstExpense` (in confetti context)
- No TypeScript errors from removed props
- App builds cleanly

---

## Step 2 — Audit for Re-implementation

Answers to each question, with file/line references from the **clean** (post-removal) codebase:

### First expense confetti

**Q1 — Sequence after RPC succeeds (ExpenseScreen.tsx ~line 558):**
1. `fetchExpenseSplits(currentGroup.id)` — refreshes splits in AppContext
2. Toast shown ("Expense added")
3. Draft cleared from sessionStorage
4. `onOpenChange(false)` — closes the drawer
5. Dashboard's `onOpenChange` handler fires → clears `editExpense`/`editSplits`, removes sheet marker

**Q2 — Cleanest detection point:**
Inside the save handler in ExpenseScreen, right after the RPC succeeds and before `onOpenChange(false)`. This is the only moment where you definitively know "a new expense was just created by this user, right now."

**Q3 — Reliable first-expense check:**
Yes. At the moment the save handler runs, `expenses` from AppContext reflects the **pre-creation** state. `expenses.length === 0` (or rather, check that no expenses exist for this group before this one) is reliable because `fetchExpenses` hasn't been called yet at that point. Even simpler: Dashboard already computes `mode === "prompt"` which means `hasExpenses === false` — this is passed as a prop currently. Post-cleanup, the equivalent check is `expenses.length === 0` at save time.

**Q4 — Cleanest place to fire:**
A callback prop from Dashboard → ExpenseScreen. Dashboard passes a `onExpenseCreated(isFirst: boolean)` callback. ExpenseScreen calls it after RPC success. Dashboard fires confetti in a `requestAnimationFrame` after the drawer close animation completes (using the existing `onOpenChange` handler pattern with a pending ref).

### Settlement confetti

**Q5 — Sequence when expense becomes fully settled (ExpenseDetailSheet.tsx):**
1. `handleSettleAll` or `handleSettleMemberShare` RPC succeeds
2. `fetchExpenses` + `fetchExpenseSplits` called → updates AppContext
3. `expenseFullySettled` derived value becomes `true`
4. Auto-close `useEffect` detects transition (unsettled→settled while open)
5. 800ms timer → `onOpenChange(false)` → drawer closes

**Q6 — Cleanest detection point:**
The auto-close `useEffect` that detects `expenseFullySettled` transitioning from false→true while the drawer is open. This is already the right pattern — it distinguishes "just settled" from "was already settled."

**Q7 — Distinguishing session settlement from pre-existing:**
`settledAtOpenRef` snapshots whether the expense was already settled when the drawer opened. The `useEffect` only fires if `!settledAtOpenRef.current && expenseFullySettled` — meaning it transitioned during this session. This pattern should be preserved.

**Q8 — Cleanest place to fire:**
Inside the auto-close timer callback in ExpenseDetailSheet, right before or after `onOpenChange(false)`. Or via a callback prop to Dashboard, fired in the detail sheet's close handler.

### Implementation approach

**Q9 — Simplest implementation:**
Two refs in Dashboard, one callback prop each direction. Total: 2 refs, 0 new components, 2 small callback props.

**Q10 — Where should confetti fire:**
**Dashboard.** It's the parent that controls both drawers. It can coordinate "fire after drawer animation completes" cleanly. ExpenseScreen and ExpenseDetailSheet just signal "something celebration-worthy happened" via callbacks.

**Q11 — False trigger risks:**
- On app load: No — confetti only fires via explicit callback from save/settle handlers
- On navigation: No — refs reset on component mount
- On other users' realtime updates: The auto-close `useEffect` could trigger on realtime settlement by another user. To prevent this, gate the callback behind a `userDidSettle` ref that's only set in the settle handlers.

**Q12 — Direct call vs utility:**
Wrap in a utility `fireConfetti()` in `src/lib/confetti-utils.ts`. Brand colors: `["#E8480A", "#FFFFFF", "#D4D4D4"]`. Multi-burst pattern (3 calls at angles 60/120/90) for a full-screen feel. Origin at `y: 0.4`.

### Implementation plan

**New file: `src/lib/confetti-utils.ts`**
```ts
import confetti from "canvas-confetti";
export function fireCelebration() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const defaults = { origin: { y: 0.4 }, zIndex: 9999, colors: ["#E8480A", "#FFFFFF", "#D4D4D4"] };
      confetti({ ...defaults, particleCount: 80, spread: 100, angle: 60 });
      confetti({ ...defaults, particleCount: 80, spread: 100, angle: 120 });
      confetti({ ...defaults, particleCount: 60, spread: 140, angle: 90 });
    });
  });
}
```

**`src/pages/Dashboard.tsx`** — add 2 refs + inline logic:
- `pendingFirstExpenseRef = useRef(false)`
- `pendingSettlementRef = useRef(false)`
- Pass `onFirstExpenseCreated={() => { pendingFirstExpenseRef.current = true }}` to ExpenseScreen
- In ExpenseScreen's `onOpenChange(!open)` handler: if `pendingFirstExpenseRef.current`, clear it and call `fireCelebration()`
- Pass `onSettlementComplete={() => { pendingSettlementRef.current = true }}` to ExpenseDetailSheet
- In `handleDetailOpenChange(!open)`: if `pendingSettlementRef.current`, clear it and call `fireCelebration()`

**`src/components/expense/ExpenseScreen.tsx`:**
- Add `onFirstExpenseCreated?: () => void` prop
- After RPC success, if `expenses.length === 0` (pre-creation state), call `onFirstExpenseCreated?.()` and show "First expense logged!" toast

**`src/components/dashboard/ExpenseDetailSheet.tsx`:**
- Add `onSettlementComplete?: () => void` prop
- Keep `settledAtOpenRef` pattern for transition detection
- Add `userDidSettleRef = useRef(false)` — set true in settle handlers, checked in auto-close effect
- In auto-close effect: if `userDidSettleRef.current`, call `onSettlementComplete?.()` before closing
- Reset `userDidSettleRef` when drawer opens

**`src/components/dashboard/EmptyState.tsx`:**
- Add small confetti burst back (import from `confetti-utils` or inline) on member add — this is a separate, simpler celebration

**Files changed:** 5 files. **New state:** 2 refs in Dashboard, 1 ref in ExpenseDetailSheet. **New props:** 2 callback props. Zero risk of false triggers.

