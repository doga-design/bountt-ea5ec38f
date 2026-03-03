
# Fix "+" Button Positioning Relative to Avatar Grid

## Problem
The `relative` wrapper around `MemberAvatarGrid` is full-width, so `right: -10px` pushes the "+" button to the screen edge rather than overlapping the last avatar.

## Solution
**File**: `src/components/expense/ExpenseScreen.tsx` (lines 650-677)

Wrap the existing `relative` div in an outer centering flex container, and change the inner div to `width: fit-content` so it shrinks to the avatar row width.

```text
// Before (lines 650-676)
{splitMode === "equal" && (
  <div className="relative">
    <MemberAvatarGrid ... />
    <button style={{ ... right: -10, ... }} />
  </div>
)}

// After
{splitMode === "equal" && (
  <div className="flex justify-center">
    <div className="relative" style={{ width: 'fit-content' }}>
      <MemberAvatarGrid ... />
      <button style={{ ... right: -18px, ... }} />
    </div>
  </div>
)}
```

### Specific changes:
1. Add outer `<div className="flex justify-center">` to center everything
2. Change inner div from `className="relative"` to `className="relative"` with `style={{ width: 'fit-content' }}`
3. Update button's `right` from `-10` to `-18` so it overlaps the last avatar's edge as shown in the ideal reference image

One file, three small edits.
