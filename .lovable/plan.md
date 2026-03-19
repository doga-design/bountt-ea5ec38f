## Group Data Isolation — 5 Targeted Fixes

### FIX 1 — `AppContext.tsx` `setCurrentGroup` (lines 182-193)

Clear all three arrays synchronously before firing async fetches for non-null groups:

```
setCurrentGroup = (group) => {
  setCurrentGroupState(group);
  setGroupMembers([]);
  setExpenses([]);
  setExpenseSplits([]);
  if (group) {
    fetchMembers(group.id);
    fetchExpenses(group.id);
    fetchExpenseSplits(group.id);
  }
}
```

### FIX 2 — `AppContext.tsx` `createGroup` (lines 151-180)

After `setCurrentGroupState(group)` on line 174, add three synchronous clears:

```
setGroupMembers([]);
setExpenses([]);
setExpenseSplits([]);
```

### FIX 3 — `AppContext.tsx` `deleteGroup` (lines 341-355)

After `setCurrentGroupState(null)` on line 350, add explicit clears (the null path in `setCurrentGroup` won't fire since we call `setCurrentGroupState` directly here):

```
setGroupMembers([]);
setExpenses([]);
setExpenseSplits([]);
```

Same treatment for `leaveGroup` (line 417-419) which has the identical pattern.

### FIX 4 — `Dashboard.tsx` loading guard (line 129)

Replace current condition with group parity check:

```
if (!currentGroup || currentGroup.id !== groupId || membersLoading || expensesLoading) {
  return <LoadingSpinner />;
}
```

This eliminates the `!hasOtherMembers && !hasExpenses` bypass that lets stale data render.

### FIX 5 — `AppContext.tsx` fetch version counter

Add `fetchVersionRef = useRef(0)`. Increment in `setCurrentGroup`. Each fetch function (`fetchMembers`, `fetchExpenses`, `fetchExpenseSplits`) captures the version at call start; on resolve, checks if it still matches before calling the setter. Stale results are silently discarded.

Affected lines:

- New ref declaration near line 52
- Increment in `setCurrentGroup` (line 182)
- Guard in `fetchMembers` (lines 198-214)
- Guard in `fetchExpenses` (lines 267-284)
- Guard in `fetchExpenseSplits` (lines 287-298)

**Notes:** For `leaveGroup` at line 417-419 — if it calls `setCurrentGroupState(null)` directly, add the three explicit clears. If it calls `setCurrentGroup(null)`, skip it — Fix 1 already handles it.

### Files touched

Only `AppContext.tsx` and `Dashboard.tsx`. No RPCs, RLS, settlement, realtime filters, or other files changed.

### What stays the same

Settlement flows, expense CRUD, realtime subscriptions, avatar system, member removal, join/claim, activity log, group switching persistence — all untouched.