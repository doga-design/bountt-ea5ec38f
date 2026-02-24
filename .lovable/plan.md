# Fix: Add Description Input + Numpad Layout Alignment

## Changes

### 1. Add Description Input Back (`ExpenseScreen.tsx`)

The old `ExpenseSheet` had a description input (`"e.g., Pizza, Rent, Groceries"`) that was removed in the rewrite. Add it back (in a consistent style to the updated numpad component):

- Add `description` state (string, default empty)
- Place a centered text input between the top bar and the chip selector
- Styling: `text-center text-sm bg-muted rounded-xl px-4 py-3`, max 50 chars
- Placeholder: `"e.g., Pizza, Rent, Groceries"`
- Use `description.trim() || "Quick Expense"` in the save RPC call (already the fallback)

### 2. Fix Numpad Vertical Alignment (`ExpenseScreen.tsx`)

The problem is the spacer div on line 362: `<div className="flex-1 min-h-0" />`. This pushes the numpad to the very bottom, creating a gap between the amount/split area and the numpad.

Per the CSS reference, the correct layout is:

- The **numpad** itself gets `flex: 1` and fills all remaining vertical space
- There is **no spacer** between the content and the save/numpad area
- The numpad keys stretch taller to fill the available space

Fix:

- **Remove** the spacer div (`<div className="flex-1 min-h-0" />`) from `ExpenseScreen.tsx`
- The `NumpadGrid` already has `flex-1` on the grid container, so it will naturally expand upward to fill all remaining space
- Add `border-top: 1px solid #DDDDD9` and `margin-top: 4px` to the numpad grid (matching the CSS reference)
- The save button sits between content and numpad with compact padding (`12px 16px 8px` per the CSS reference)

### 3. Save Button Padding Adjustment (`SaveButton.tsx`)

Per the CSS reference, save wrap uses `padding: 12px 16px 8px`. Update the padding from `px-5 pb-5 pt-2` to `px-4 pb-2 pt-3`.  
  
4.(OPTIONAL) if you have the time, fix this: whenever a number is added with all the customizations, it still logs & adds that number to dashboard as a "generic, default" cost card showing the default value 50/50 (even though it was "custom split") fix that so evertyhing about the "customized" cost is entered to dashboard CORRECTLY.

## Files Modified


| File                                       | Changes                                                                     |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `src/components/expense/ExpenseScreen.tsx` | Add `description` state + input, remove spacer div, pass description to RPC |
| `src/components/expense/NumpadGrid.tsx`    | Add border-top + margin-top styling                                         |
| `src/components/expense/SaveButton.tsx`    | Adjust padding to match CSS reference                                       |
