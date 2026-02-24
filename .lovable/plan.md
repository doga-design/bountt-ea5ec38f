

# Fix Expense Feed Sorting and Date Grouping

## Bugs Found

### Bug A: "TODAY" expenses showing as "YESTERDAY"
The `formatRelativeDate` function in `src/lib/bountt-utils.ts` parses date-only strings (e.g., "2026-02-24") using `new Date()`, which interprets them as UTC midnight. For users in timezones behind UTC (all of the Americas), this shifts the date back by one day, causing "today" expenses to appear under "YESTERDAY".

**Fix:** Parse the date string manually as a local date by splitting the year/month/day components.

### Bug B: Oldest expenses appearing at top within same date
The Supabase query in `AppContext.tsx` sorts only by `date DESC` but not by `created_at DESC`. Within the same date, expenses appear in database insertion order (oldest first) instead of newest first.

**Fix:** Add a secondary sort by `created_at` descending.

## Changes

### 1. `src/lib/bountt-utils.ts` -- Fix date parsing (lines 38-53)

Change the `formatRelativeDate` function to parse the date string as local time instead of UTC:

```typescript
export function formatRelativeDate(dateStr: string): string {
  // Parse as local date to avoid UTC timezone shift
  const parts = dateStr.split("-");
  const target = new Date(
    parseInt(parts[0]),
    parseInt(parts[1]) - 1,
    parseInt(parts[2])
  );
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffMs = today.getTime() - target.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "TODAY";
  if (diffDays === 1) return "YESTERDAY";
  if (diffDays <= 7) return "LAST WEEK";
  if (diffDays <= 14) return "2 WEEKS AGO";

  return target.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
}
```

### 2. `src/contexts/AppContext.tsx` -- Add secondary sort (line 272)

Add `.order("created_at", { ascending: false })` after the date sort so newest expenses within the same day appear first:

```typescript
const { data, error: fetchError } = await supabase
  .from("expenses")
  .select("*")
  .eq("group_id", groupId)
  .order("date", { ascending: false })
  .order("created_at", { ascending: false });
```

## Files Modified

| File | Change |
|------|--------|
| `src/lib/bountt-utils.ts` | Parse date-only string as local time to fix TODAY/YESTERDAY labels |
| `src/contexts/AppContext.tsx` | Add secondary sort by `created_at` descending for correct ordering within same date |

