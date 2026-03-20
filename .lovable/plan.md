

## Fix: Dashboard Onboarding Flash on Navigation

### Root Cause
Two compounding issues:

1. **`setCurrentGroup` clears data for the same group.** When navigating Groups → Dashboard for a group already loaded, `setCurrentGroup` unconditionally runs `setGroupMembers([]); setExpenses([]); setExpenseSplits([])` and re-fetches. This creates a window where arrays are empty.

2. **No expenses loading guard.** Dashboard uses `const isLoading = membersLoading` (line 118) but there is no `expensesLoading` state. Members finish loading first, the guard drops, but expenses are still `[]` → mode computes as `"prompt"` → onboarding flash.

### Fix (minimum changes)

**File 1: `src/contexts/AppContext.tsx`**
- Add `expensesLoading` state (initialized `false`, like `membersLoading`)
- Set it `true`/`false` in `fetchExpenses` (mirror the pattern in `fetchMembers`)
- In `setCurrentGroup`: skip clear + re-fetch if `group.id` matches current group id
- Expose `expensesLoading` in context value

**File 2: `src/pages/Dashboard.tsx`**
- Pull `expensesLoading` from `useApp()`
- Change line 118 from `const isLoading = membersLoading` to `const isLoading = membersLoading || expensesLoading`

**File 3: `src/types/index.ts`**
- Add `expensesLoading: boolean` to `AppContextValue` interface

### Result
- Same-group navigation: no data clearing, no flash, instant render
- Different-group navigation: data clears, loading spinner shows until both members AND expenses are loaded, then mode is computed correctly

