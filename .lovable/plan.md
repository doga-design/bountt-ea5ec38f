

# Fix: "YOU" Hardcoded in Database Instead of Being Rendered Dynamically

## Problem

When a user creates an expense and selects "You" as the payer, the literal string `"You"` is stored in the `paid_by_name` column of the `expenses` table. This means when any OTHER user views that expense, they also see "Paid by You" -- as if they paid it themselves.

The actual code logic for determining "is this the current user?" is already correct everywhere (it uses `user?.id` from auth, not `group.created_by`). The **only bug** is the stored value `"You"` in the database.

## Root Cause

One line in `ExpenseSheet.tsx` (line 76):
```
paid_by_name: isPayerSelf ? "You" : payer.name
```
This stores the literal string "You" instead of the payer's actual name.

## Fixes

### 1. Store actual payer name (not "You") in ExpenseSheet.tsx

Change line 76 from:
```
paid_by_name: isPayerSelf ? "You" : payer.name
```
To:
```
paid_by_name: payer.name
```

This ensures the database always has the real name. The "You" label is already handled at render time by `ExpenseCard.tsx` (line 47: `isPayer ? "You" : expense.paid_by_name`).

### 2. Fix MemberDetailSheet.tsx shared expenses display

Line 146 currently shows `exp.paid_by_name` directly without checking if the current user is the payer. Change it to show "You" when the current user paid.

### 3. Fix corrupted data in database

Update all existing rows where `paid_by_name = 'You'` to use the actual user's name. Based on the data, user `58a3bc3b-...` is "Sarah Edwards" and has multiple expenses stored as "You". These need to be corrected.

Also fix the `dogacimen35` entries for user `46f9f7c2-...` -- these should use their display_name if available.

## Files Modified

1. **`src/components/dashboard/ExpenseSheet.tsx`** -- Remove the ternary on line 76, always store `payer.name`
2. **`src/components/group-settings/MemberDetailSheet.tsx`** -- Add current-user check on line 146 to display "You paid" vs "[Name] paid"

## Data Fix

SQL to correct existing records:
- Update `paid_by_name` from `'You'` to the member's actual name for all affected expenses

## No Other Changes Needed

The rest of the codebase already correctly uses `user?.id` (the authenticated user) for all "is this me?" checks:
- `DashboardHeader.tsx` line 45: `member.user_id === user?.id`
- `ExpenseCard.tsx` line 13: `expense.paid_by_user_id === user?.id`
- `BalancePill.tsx`: uses `user?.id` for balance calculation
- `MemberCardScroll.tsx` line 23: filters by `currentUserId`
- `MemberCard.tsx`: receives `isCurrentUser` prop correctly

The "YOU" display is already dynamic at render time -- the only issue was the stored database value leaking through.
