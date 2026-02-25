

# Fix "UPCOMING" Label Bug

## Problem

When a user logs an expense, the database may store the date in UTC. If the user is behind UTC (e.g., US timezones), a late-night expense gets a date like `"2026-02-26"` while the user's local date is still Feb 25. The function calculates `diffDays = -1` and returns "UPCOMING" -- nonsensical for a just-logged expense.

## Root Cause

Line 53 in `formatRelativeDate`: `if (diffDays < 0) return "UPCOMING";`

This assumes negative `diffDays` means a future event, but in an expense tracker, it's always a timezone artifact (UTC date slightly ahead of local date).

## Fix

**In `src/lib/bountt-utils.ts`**: Replace the `diffDays < 0` branch. Clamp negative values to 0 so they're treated as "TODAY":

```
if diffDays <= 0  -> "TODAY"
```

This single change handles all edge cases:
- User in UTC-12 logs expense at 11pm (UTC date is next day) -> "TODAY"
- User in UTC+0 logs expense -> "TODAY"  
- Any timezone artifact producing -1 or -2 -> "TODAY"

No other files need changes.

## Files Modified

| File | Change |
|------|--------|
| `src/lib/bountt-utils.ts` | Change `diffDays < 0` from "UPCOMING" to collapse into the "TODAY" check (`diffDays <= 0`) |

