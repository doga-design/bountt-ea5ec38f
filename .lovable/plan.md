

## Fix: Remove `expensesLoading` to prevent dashboard content hiding

### Problem
`fetchExpenses` sets `expensesLoading = true` (AppContext line 302), which feeds into `isLoading` in Dashboard (line 110), hiding the entire dashboard content area. Called from ExpenseDetailSheet and NetBalanceSlide during settlements.

### Changes

**1. `src/contexts/AppContext.tsx`**
- Line 38: Delete `const [expensesLoading, setExpensesLoading] = useState(false);`
- Line 302: Delete `setExpensesLoading(true);`
- Lines 318-319: Remove `setExpensesLoading(false)` from finally block (keep the version guard, just remove the setter)
- Line 592: Remove `expensesLoading` from context value object

**2. `src/pages/Dashboard.tsx`**
- Line 33: Remove `expensesLoading` from destructured context
- Line 110: Change `const isLoading = membersLoading || expensesLoading;` → `const isLoading = membersLoading;`

**3. `src/types/index.ts`**
- Line 121: Delete `expensesLoading: boolean;`

Three files, six line-level deletions/edits. No logic changes to fetching, realtime, or ExpenseScreen.

