

# Fix: Persistent Numpad + Step 2 Inline Controls

## Problem
The current implementation swaps the entire panel content between Step 1 and Step 2 using a conditional (`step === 1 ? ... : ...`). This removes the numpad entirely on Step 2, breaking the custom split editing flow and violating the design intent. The numpad must always be visible -- it drives both the total amount input (Step 1) and custom row editing (Step 2).

Step 2's interactive elements (sentence with tappable chips, description input, save button) are also not rendering as described. The full flow should be:

- **Step 1**: Large amount display + continue button + numpad
- **Step 2**: Compact amount + live sentence (with tappable payer, mode, members) + description + save button + **numpad still pinned at the bottom**

## Solution

### Changes (1 file: `src/components/expense/ExpenseScreen.tsx`)

**Replace the `step === 1 ? ... : ...` conditional** (lines 591-758) with a single layout where the numpad is always rendered at the bottom and the upper content transitions between steps.

#### New layout structure (inside the `max-w-[430px]` container):

```text
+-------------------------------+
| Top bar (title, back/close)   |  <- flex-shrink-0
+-------------------------------+
| Upper content area            |  <- flex-1, overflow-y-auto
|   Step 1: AmountDisplay large |
|     OR                        |
|   Step 2: Compact amount      |
|           SplitSentence       |
|           CustomSplitRows     |
|           Description input   |
+-------------------------------+
| Action row                    |  <- flex-shrink-0
|   Step 1: Continue button     |
|   Step 2: SaveButton          |
+-------------------------------+
| NumpadGrid (ALWAYS)           |  <- flex-shrink-0
+-------------------------------+
```

#### Specific changes:

1. **Top bar**: Always renders. In Step 1: title "Adding cost" + close button. In Step 2: back arrow (create mode only) + title "Who's splitting?" + close button. Same as current, just not duplicated.

2. **Upper content area** (`flex-1 overflow-y-auto min-h-0`):
   - **Step 1**: `AmountDisplay` (large format) centered vertically
   - **Step 2**: 
     - Compact `AmountDisplay` (tappable back to Step 1 in create mode, read-only in edit mode)
     - Locked payer label (edit mode only)
     - `SplitSentence` with all existing props (isCoverMode, coveredMemberName, onToggleMember, onSetPayer, etc.)
     - `CustomSplitRows` (slides in when custom mode active)
     - Description input

3. **Action row** (`flex-shrink-0`):
   - **Step 1**: Continue button with arrow (disabled when amount is "0")
   - **Step 2**: `SaveButton` with all current props

4. **NumpadGrid** (`flex-shrink-0`): Always rendered at the bottom, no conditional. `onKey={handleKey}` works for both steps because `handleKey` already routes to either the amount or the focused custom row based on `splitMode` and `focusedMemberId`.

#### What does NOT change:
- All state variables, refs, callbacks (`handleKey`, `handleToggleChip`, `handleSetPayer`, `toggleMode`, `handleContinue`, `handleSave`, `handleDismiss`)
- The slide-up/slide-down animation wrapper (backdrop + panel)
- `SplitSentence` component and its drawer-based interactions
- `CustomSplitRows`, `AmountDisplay`, `SaveButton` components
- Cover mode derivation and chip logic
- No new files, no new dependencies
