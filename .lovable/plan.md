

## One Surgical Fix — Dashboard.tsx

### Problem
Lines 130-136: early return renders spinner and prevents the entire tree (including `ExpenseScreen` at line 231) from mounting. Any loading state flip unmounts ExpenseScreen, destroying local state.

### Change
Replace the early-return guard with inline conditional rendering. The `!currentGroup || currentGroup.id !== groupId` parity check still needs to gate the main content (it depends on `currentGroup` being valid), but `ExpenseScreen` must always render.

**Dashboard.tsx lines 129-245** restructured to:

1. Keep the parity check (`!currentGroup || currentGroup.id !== groupId`) — if true, show spinner in the feed area but still render `ExpenseScreen` at the bottom.
2. Remove `membersLoading || expensesLoading` from the full-page guard entirely — those only affect the feed content area.
3. Structure:

```text
return (
  <div className="screen-container">
    {/* Parity or loading: show spinner in content area */}
    {(!currentGroup || currentGroup.id !== groupId || isLoading) ? (
      <div className="flex-1 flex items-center justify-center">
        <spinner />
      </div>
    ) : (
      /* Normal dashboard content: header, mode branches, feed, bottom nav, detail sheet */
    )}

    {/* ALWAYS mounted regardless of loading */}
    <ExpenseScreen ... />
  </div>
)
```

4. `ExpenseScreen` stays at the end of the tree, always rendered, controlled only by `sheetOpen`.

### Files Changed
- `src/pages/Dashboard.tsx` — only file touched

### What Does NOT Change
- No AppContext changes
- No ExpenseScreen changes  
- No realtime subscription changes
- No loading state logic changes

