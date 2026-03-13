

# Fix: Activity Log "Paid" Row Uses Wrong Name

## The Bug
Line 501: `{actorLabel} {actionLabel}` — for "added" entries, `actorLabel` is derived from `log.actor_id` (the person who logged the expense). But the "Paid" label should show the **payer**, not the creator.

## The Fix
**File:** `src/components/dashboard/ExpenseDetailSheet.tsx`, lines 488-501

For `action_type === "added"` entries only, derive the display name from `expense_snapshot.paid_by_name` instead of `actorLabel`. Apply "You" substitution using `expense.paid_by_user_id === user?.id` (same logic as the sheet header at line 69).

Replace the rendering at line 501 so that when `log.action_type === "added"`, it uses a separate `paidByLabel` variable:

```
// Inside the "added" branch (line 488-490):
const snapshotPayerName = log.expense_snapshot?.paid_by_name ?? "Someone";
const paidByLabel = expense?.paid_by_user_id === user?.id ? "You" : snapshotPayerName;
```

Then at line 501, use `paidByLabel` for "added" entries instead of `actorLabel`:

```
{logDate} · {log.action_type === "added" ? paidByLabel : actorLabel} {actionLabel}
```

One file, three lines changed. No other modifications.

