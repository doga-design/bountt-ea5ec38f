
# Fix: Store Real Name Instead of "You" in Database

## Problem

When any user logs an expense as themselves, `ExpenseSheet.tsx` stores the literal string `"You"` as `paid_by_name` in the database. Every other user viewing that expense then also sees "You" instead of the payer's actual name, because the `ExpenseCard` falls back to the stored `paid_by_name` when the viewer isn't the payer.

## Root Cause

Line 76 in `src/components/dashboard/ExpenseSheet.tsx`:
```
paid_by_name: isPayerSelf ? "You" : payer.name
```

This violates the app's established pattern of storing absolute values in the database and rendering user-relative labels ("You") dynamically in the UI.

## Fix

### 1. `src/components/dashboard/ExpenseSheet.tsx`

Change line 76 from:
```
paid_by_name: isPayerSelf ? "You" : payer.name,
```
to:
```
paid_by_name: payer.name,
```

Always store the real member name. The UI layer (`ExpenseCard.tsx`) already handles displaying "You" dynamically based on `paid_by_user_id === user.id`.

### 2. Fix Existing Bad Data

Run an UPDATE query to fix any existing expenses that have `paid_by_name = 'You'`. We can resolve the correct name by looking up the payer's `group_members` record:

```sql
UPDATE expenses e
SET paid_by_name = gm.name
FROM group_members gm
WHERE e.paid_by_user_id = gm.user_id
  AND e.group_id = gm.group_id
  AND e.paid_by_name = 'You';
```

This ensures all historical data is also corrected.

## Files Changed

| File | Change |
|------|--------|
| `src/components/dashboard/ExpenseSheet.tsx` | Always store `payer.name` instead of conditional "You" |

## Why This Works

The `ExpenseCard` component already renders the payer label correctly:
```
{isPayer ? "You" : expense.paid_by_name}
```

By storing the real name, each user sees "You" for their own expenses and the actual payer name for others -- exactly as intended by the user-perspective logic pattern.
