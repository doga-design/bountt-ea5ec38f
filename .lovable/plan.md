

# Fix: Duplicate Member Bug Causing Wrong Split Math

## Root Cause

When a member is added via `addPlaceholderMember`, two things happen simultaneously:
1. The function appends the new member to local state (`setGroupMembers(prev => [...prev, member])`)
2. The realtime subscription fires an INSERT event and appends the **same member again**

This means `groupMembers` contains duplicates (e.g. `[You, Kyle, Kyle]`), so `distributeCents` splits among 3 instead of 2, producing wrong amounts.

The same race condition exists for expenses (the `addExpense` + realtime INSERT handler).

## Fixes

### 1. Deduplicate realtime handlers in `src/contexts/AppContext.tsx`

**Members handler (line 418-419):** Change from blindly appending to checking if the member ID already exists:
```text
// Before:
setGroupMembers((prev) => [...prev, payload.new as GroupMember]);

// After:
setGroupMembers((prev) => {
  const newMember = payload.new as GroupMember;
  if (prev.some((m) => m.id === newMember.id)) return prev;
  return [...prev, newMember];
});
```

**Expenses handler (line 399-400):** Same dedup pattern:
```text
// Before:
setExpenses((prev) => [payload.new as Expense, ...prev]);

// After:
setExpenses((prev) => {
  const newExpense = payload.new as Expense;
  if (prev.some((e) => e.id === newExpense.id)) return prev;
  return [newExpense, ...prev];
});
```

### 2. Clean up corrupt data in the database

Delete the duplicate split rows for the existing $10 expense, then re-insert correct 2-way splits ($5.00 each).

### 3. Refetch splits after expense insert

The `ExpenseSheet` already calls `fetchExpenseSplits` after insert -- this is fine, but ensure it uses the freshly-fetched (deduplicated) member list for the split calculation.

## Files Modified

- `src/contexts/AppContext.tsx` -- deduplicate realtime INSERT handlers for both members and expenses

## Data Fix

- Delete 3 incorrect split rows for expense `8dd68870-...`
- Insert 2 correct split rows: $5.00 each for you and Kyle

