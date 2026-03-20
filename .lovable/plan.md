
Root-cause assessment (based on your “whole page reloads” answer):
1) The numpad reset is caused by a remount, not just a re-render. `ExpenseScreen` keeps all draft data in local component state, so any remount wipes amount/slide/member/payer.
2) Even after the dashboard loading fix, there are still global remount paths above `ExpenseScreen` (route/auth-level guard transitions), which can feel like a full refresh.
3) Current `ExpenseScreen` has no draft persistence fallback, so one unexpected remount always forces re-entry from scratch.

Implementation plan (single bugfix track, resilience-first):
1) Stop route-level unmounts during background auth/group churn
- Update `AuthGuard` so it only blocks on true auth bootstrap (`authLoading`), not group-list loading transitions.
- Keep redirect behavior for unauthenticated users unchanged.

2) Harden auth state handling to avoid destructive transient clears
- In `AppContext` `onAuthStateChange`, only run full `clearAllState()` on explicit signed-out transitions.
- Ignore transient `null` sessions for non-signout events so dashboard/sheets don’t get torn down mid-use.

3) Add in-progress expense draft persistence (session-scoped)
- In `ExpenseScreen`, persist draft state while open (amount, slide, split mode, selected members, payer, custom rows, focused row, description).
- Hydrate that draft on reopen/remount for the same user+group in create mode.
- Clear draft on successful save or intentional close.

4) Restore sheet visibility after unexpected remount
- In `Dashboard`, persist “sheet was open” marker while expense entry is active.
- On mount, if a valid in-progress draft marker exists for current group/user, auto-restore `sheetOpen=true`.
- Clear marker when user closes or saves.

5) Keep current realtime and settlement logic intact
- No changes to subscriptions, RPC behavior, or split settlement flow.
- This fix is purely lifecycle/state-stability focused.

Files to change:
- `src/components/AuthGuard.tsx`
- `src/contexts/AppContext.tsx`
- `src/pages/Dashboard.tsx`
- `src/components/expense/ExpenseScreen.tsx`

Technical notes:
- Storage keys will be namespaced by `groupId + userId` to prevent cross-group leakage.
- Draft restore will be disabled in edit mode (edit form should always initialize from selected expense).
- Draft persistence will be session-level (sessionStorage) so stale drafts do not survive long-term.

Validation after implementation:
1) User A opens ExpenseScreen, types amount, selects payer/members/custom split.
2) User B logs a new expense.
3) User A must remain in-place with same draft intact (no close/reset).
4) Feed can update in background without forcing full-screen refresh behavior.
5) Repeat in both “first expense” and “existing feed” groups.
