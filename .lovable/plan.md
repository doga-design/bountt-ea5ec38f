

# Fix: Restore total amount display in Custom Mode

## Problem
Line 616 in `ExpenseScreen.tsx` conditionally hides `AmountDisplay` when `splitMode === "custom"`. This was added in the previous round to remove a "duplicate total," but there is no actual duplicate — this is the only total amount display on Slide 2. Hiding it leaves users unable to see the total they entered.

## Solution
**File**: `src/components/expense/ExpenseScreen.tsx` (line 616)

Remove the `splitMode !== "custom"` guard so `AmountDisplay` always renders on Slide 2:

```text
// Before
{splitMode !== "custom" && <AmountDisplay amount={amount} size="medium" />}

// After
<AmountDisplay amount={amount} size="medium" />
```

One line change. Nothing else is touched.
