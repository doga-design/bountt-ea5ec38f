
# Add Cover Mode UX to Custom Split Rows

## Problem
Cover mode exists in the code (triggered by deselecting yourself in the member drawer opened via the sentence), but there's no visible, discoverable entry point for it. The user expects an inline "Exclude myself" label on their own row in the custom split panel, plus a ghosted state with "Add myself back" undo affordance.

## Solution

### File 1: `src/components/expense/CustomSplitRows.tsx`

Add cover mode awareness to the component:

**New props:**
- `isCoverMode: boolean` -- whether cover mode is active
- `payerMemberId: string | undefined` -- the payer's member ID (to identify "self" row for exclude)
- `onExcludeSelf: () => void` -- called when user taps "Exclude myself"
- `onAddSelfBack: () => void` -- called when user taps "Add myself back"

**Row behavior changes for the current user's row:**

- **Normal custom mode (not cover):** Subtitle changes from `"tap to edit"` to `"Exclude myself -->"` (tappable). Tapping it calls `onExcludeSelf` instead of `onFocus`.
- **Cover mode active:** The user's row renders in a ghosted state:
  - Opacity reduced, background faded (e.g. `bg-muted/30`)
  - Amount shows `$0` grayed out
  - Subtitle shows `"Add myself back"` (tappable, calls `onAddSelfBack`)
  - Row is not focusable for numpad input
- **Other members' rows:** Unchanged behavior -- tap to focus, show amounts

**Collapse logic:** The `visible` prop already controls panel visibility. When cover mode activates and only 1 member remains, the parent (`ExpenseScreen`) will set `splitMode` back to `"equal"`, which makes `visible={splitMode === "custom" && !isCoverMode}` collapse the panel automatically. This already works.

### File 2: `src/components/expense/ExpenseScreen.tsx`

**New handler -- `handleExcludeSelf`:**
- Calls `handleToggleChip(currentUserMemberId)` which already handles cover mode entry (deselects self, restricts to single selection, resets to equal mode)

**New handler -- `handleAddSelfBack`:**
- Adds `currentUserMemberId` back into `activeIds`
- Resets `splitMode` to `"equal"` and clears custom amounts
- This exits cover mode since `isCoverMode = !activeIds.has(payerId)` becomes false

**Pass new props to CustomSplitRows:**
```
<CustomSplitRows
  members={selectedMembers}
  currentUserId={user?.id}
  customAmounts={customAmounts}
  focusedMemberId={focusedMemberId}
  shakeMemberId={shakeMemberId}
  onFocus={handleFocusRow}
  visible={splitMode === "custom" && !isCoverMode}
  isCoverMode={isCoverMode}
  payerMemberId={currentUserMemberId}
  onExcludeSelf={handleExcludeSelf}
  onAddSelfBack={handleAddSelfBack}
/>
```

Note: The custom panel auto-collapses when cover mode activates (because `visible` becomes false), and the sentence updates to "You paid, covering for Jay" via the existing `SplitSentence` component. The "Add myself back" affordance would appear only if the user re-opens custom mode -- but since cover mode hides the custom panel, the primary "undo" path is tapping themselves in the member drawer (which already shows a toast) or tapping the covered member name in the sentence.

**Alternative undo path:** Add a small inline "Add myself back" pill below the sentence when `isCoverMode` is true, so the user doesn't need to find the drawer. This renders inside the Step 2 content area, between the `SplitSentence` and the description input.

### What does NOT change
- SplitSentence component (already handles cover mode sentence)
- SaveButton (already shows "Cover it" in cover mode)
- NumpadGrid, AmountDisplay
- All save/edit logic, cover mode DB writes
- No new files, no new dependencies
