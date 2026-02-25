

# Fix Date Calculation Bug in formatRelativeDate

## Overview

Replace the broken `formatRelativeDate` function in `src/lib/bountt-utils.ts` with a corrected version that properly parses dates and generates dynamic relative labels.

## Changes

### `src/lib/bountt-utils.ts` — Rewrite `formatRelativeDate`

**What changes:**

1. **Fix date parsing**: Extract date portion before "T" to handle both `"2026-02-24"` and `"2026-02-24T18:30:00.000Z"` formats
2. **Fix timezone**: Parse year/month/day as local midnight to avoid UTC off-by-one errors
3. **Dynamic labels**: Replace hardcoded ranges with calculated week/month/year labels

**New logic:**

```
datePart = dateStr.split("T")[0]
parts = datePart.split("-")
target = new Date(year, month-1, day)  // local midnight
today = new Date(now.year, now.month, now.date)  // local midnight
diffDays = Math.round((today - target) / 86400000)

if diffDays < 0   -> "UPCOMING"
if diffDays === 0  -> "TODAY"
if diffDays === 1  -> "YESTERDAY"
if diffDays <= 7   -> "LAST WEEK"
if diffDays <= 28  -> Math.ceil(diffDays/7) + " WEEKS AGO"
if diffDays <= 60  -> "LAST MONTH"
if diffDays <= 365 -> Math.floor(diffDays/30) + " MONTHS AGO"
if diffDays <= 730 -> "LAST YEAR"
else               -> Math.floor(diffDays/365) + " YEARS AGO"
```

## Files Modified

| File | Change |
|------|--------|
| `src/lib/bountt-utils.ts` | Rewrite `formatRelativeDate` function (lines 36-52) |

