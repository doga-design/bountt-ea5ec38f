# Tweaks and Bug Fixes: Custom Edit UX, Numpad Size, Single-User Copy

## Changes

### 1. Custom Cost Edit UX -- Replace on First Input (`ExpenseScreen.tsx`)

Add a `freshFocus` flag that is set to `true` whenever a custom row is focused (tapped). On the first numpad key press while `freshFocus` is true:

- **Number key**: Replace the entire field with that digit (not append)
- **Delete key**: Clear to "0" immediately
- **Decimal key**: Replace with "0."
- After the first key, set `freshFocus = false` so subsequent keys append normally

Changes in `handleKey`:

- When `isCustomFocused && freshFocus`: set the field to `key` directly (or "0" for del, or "0." for dot), then set `freshFocus = false`
- In `handleFocusRow`: set `freshFocus = true`

### 2. Numpad Sizing (`NumpadGrid.tsx`)

Match the screenshot proportions -- keys need to be much taller and text larger:

- Number text: bump from `text-2xl` (24px) to `text-[36px]`
- Sub-letters: keep at 9px
- Delete icon: bump from `w-6 h-6` to `w-7 h-7`
- Add `min-h-[72px]` to each key button (currently has `minHeight: 0`)
- The grid itself already uses `flex-1` so it fills remaining space -- this is fine

### 3. Single-User Disabled State

**SplitSentence.tsx:**

- Accept a new `isSingleUser` prop
- When `isSingleUser` is true, display "assigning a split" instead of the normal split sentence
- Disable the mode toggle button when single user

**SaveButton.tsx:**

- Accept a new `isSingleUser` prop
- When `isSingleUser` is true, force disabled state regardless of amount

**ExpenseScreen.tsx:**

- Compute `isSingleUser = selectedMembers.length <= 1`
- Pass `isSingleUser` to `SplitSentence` and `SaveButton`
- Also disable the mode toggle when single user

### 4. Button Copy

Per the screenshot, the save button text should be "Save" not "Save Expense". Update in `SaveButton.tsx`.  
  
**ALSO ONE MORE THING;** When all users are selected including the user itself ("you"), it displays all other selected user's names but not the user itself "you". **Fix this bug as well.**

## Files Modified


| File                                       | Changes                                                 |
| ------------------------------------------ | ------------------------------------------------------- |
| `src/components/expense/ExpenseScreen.tsx` | Add `freshFocus` state, pass `isSingleUser` prop        |
| `src/components/expense/NumpadGrid.tsx`    | Increase key height and font sizes                      |
| `src/components/expense/SplitSentence.tsx` | Handle single-user "assigning a split" copy             |
| `src/components/expense/SaveButton.tsx`    | Add `isSingleUser` disable logic, change text to "Save" |
