# Bountt Cost Logging Flow Rebuild

## Overview

Complete rebuild of the expense entry flow from a single full-screen interface into a two-slide bottom drawer. This replaces `ExpenseScreen.tsx` and updates related components while preserving all RPC logic, AppContext, and settlement systems.

## What Gets Deleted

- `src/components/expense/ExpenseSheet.tsx` -- dead code, remove entirely
- `src/components/expense/ExpenseScreen.tsx` -- delete and rebuild from scratch

## What Gets Created (New Files)

- `src/components/expense/MemberAvatarGrid.tsx` -- avatar selection grid for Slide 2
- `src/components/expense/PayerAvatar.tsx` -- circular payer avatar next to amount on Slide 2
- `src/assets/avatars/avatar01.svg` through `avatar05.svg` -- copy all 5 uploaded SVG files

## What Gets Rebuilt

- `src/components/expense/ExpenseScreen.tsx` -- new two-slide drawer architecture
- `src/components/expense/SplitSentence.tsx` -- simplified for new layout (no member drawer, just text display + payer drawer)
- `src/components/expense/SaveButton.tsx` -- new "Log cost +" / "Log cost -->" states with shake animation
- `src/components/expense/NumpadGrid.tsx` -- visual update (rounded rectangles with soft shadows, keep key logic)
- `src/components/expense/AmountDisplay.tsx` -- updated for both slide contexts
- `src/components/expense/CustomSplitRows.tsx` -- updated to use large circular SVG avatars with amount boxes per Image 5

## What Gets Fixed (Minor)

- `src/contexts/AppContext.tsx` (line 475) -- add `filter: 'expense_id=in.(select id from expenses where group_id=eq.GROUP_ID)'` or use a workaround to scope realtime to current group only

## Architecture: Two-Slide Drawer

```text
+----------------------------------+
|     Dashboard (blurred behind)   |
+----------------------------------+
|  [Drawer - 85dvh, slide-up]     |
|                                  |
|  SLIDE 1 (Amount Entry)         |
|  - Drag handle                  |
|  - "What did you pay?"          |
|  - $[amount] + blinking cursor  |
|  - "I am covering..." (visual)  |
|  - "Log cost +" button          |
|  - NumpadGrid                   |
|                                  |
|  SLIDE 2 (Split Config)         |
|  - Back arrow + Drag handle     |
|  - $[amount] + PayerAvatar      |
|  - SplitSentence                |
|  - MemberAvatarGrid             |
|  - "I am covering..." (visual)  |
|  - "Log cost +" button          |
|                                  |
+----------------------------------+
```

Slides transition via `translateX` -- Slide 1 moves left, Slide 2 moves in from the right. State variable `currentSlide: 1 | 2` controls this.

## Detailed Component Specs

### ExpenseScreen.tsx (Full Rebuild)

- Renders as a custom overlay div (not using Drawer component) with dark backdrop (#000 at 60% opacity, backdrop-blur-sm)
- Fixed height: 85dvh from bottom
- Contains two "slides" in a horizontal container, controlled by `translateX(0)` vs `translateX(-100%)`
- All existing state management preserved: `amount`, `splitMode`, `activeIds`, `customAmounts`, `focusedMemberId`, `freshFocus`, `shakeMemberId`, `payerId`, `loading`
- New state: `currentSlide` (1 or 2)
- Member list snapshotted on open via `useRef` -- only recomputes when `open` changes from false to true
- `handleKey` dependency array fixed to include `customAmounts` and `activeIds`
- Description field REMOVED -- hardcoded to "Quick Expense"
- On Slide 1, "Log cost +" tapping: if amount is 0, shake the button (350ms); if amount > 0, transition to Slide 2
- On Slide 2, back arrow: returns to Slide 1, amount preserved
- If amount changed when returning to Slide 2 and custom mode is active, custom amounts reset to equal
- Backdrop tap closes drawer entirely

### Slide 1 Layout

Per Image 1:

- Drag handle pill (gray, centered)
- "What did **you** pay?" -- "you" in orange with dotted underline, tappable (opens payer selector)
- Large `$[amount]` centered, Sora font, with blinking orange cursor
- Spacer
- "I am covering for someone" with circular arrow icon (visual only)
- "Log cost +" / disabled "Log cost -->" button
- NumpadGrid at bottom

### Slide 2 Layout

Per Images 2-4:

- Back arrow (circular, top-left) + drag handle
- `$[amount]` (slightly smaller) + PayerAvatar (44px, circular, to the right)
- SplitSentence: "[Payer] paid, splitting [equally/custom] with [names]"
- MemberAvatarGrid: all active members EXCEPT payer, horizontal row, grayscale when deselected, colored when selected, "+" button at end
- "I am covering for someone" (visual only)
- "Log cost +" / disabled "Log cost -->" button

### MemberAvatarGrid.tsx (New)

- Receives: members (excluding payer), activeIds, onToggle callback, currentUserId
- Renders horizontal row of circular avatars
- Deselected: grayscale filter on avatar, muted name
- Selected: full color (using member's avatar_color as background), bold name
- Avatars scale dynamically based on count to fit screen width (no wrapping)
- "+" button at end of row (visual only, no handler)
- Tapping toggles selection

### PayerAvatar.tsx (New)

- Receives: payerMember, onClick, isEditMode
- Renders circular avatar (~44px) with member's SVG avatar and avatar_color background
- Tapping opens payer selector (or shows locked toast in edit mode)

### SaveButton.tsx (Rebuild)

- Two visual states:
  - **Disabled**: gray background (#EAEAE6), muted text, shows "Log cost" with arrow icon (-->), fully non-interactive on Slide 2, shake animation on Slide 1
  - **Active**: orange (#D94F00) background, white text, shows "Log cost" with "+" icon
- Props: `enabled`, `loading`, `onClick`, `shakeOnDisabledClick` (for Slide 1 behavior)

### NumpadGrid.tsx (Visual Update)

- Keep exact same key logic and layout
- Update style: rounded rectangles with soft shadow instead of flat gray cells
- Keep sub-letters on 2-9
- Keep backspace icon

### SplitSentence.tsx (Rebuild)

- Simplified: only renders the sentence text and payer selector drawer
- No member selection drawer (that's handled by MemberAvatarGrid now)
- Payer name: orange, dotted underline, tappable
- Mode word: orange for "equally", blue for "custom", dotted underline, tappable to toggle
- Names list: "No one" when empty, otherwise comma-separated with "&" for last

### CustomSplitRows.tsx (Update)

- Per Image 5: large circular avatars (~80px) with amount box to the right
- Rows separated by hairline dividers
- Focused row highlighted
- Numpad inputs into focused row

### AppContext.tsx (Minor Fix)

- Line 475: Add filter to the expense_splits realtime channel so it only receives events for expenses in the current group. Since we can't filter by group_id directly on expense_splits (no group_id column), the pragmatic fix is to keep the current approach but it already scopes the re-fetch to `currentGroupRef.current?.id`. The existing behavior is functionally correct (just slightly noisy). No change needed here unless we add a group_id column to expense_splits.
- In AppContext, on the expense_splits realtime channel INSERT/UPDATE/DELETE handler, add a guard: if the received payload's expense_id is not in the current local expenses array, ignore the event. This prevents cross-group noise without a schema change.

### Avatar Files

- Copy all 5 SVG avatar files to `src/assets/avatars/`
- For this rebuild, avatars are assigned randomly from this set per member (future: stored in DB)
- Use the member's `avatar_color` as the background circle color, render the SVG illustration inside
- Avatar assignment must be deterministic. Derive the avatar index from the member's `id` string — for example `parseInt(member.id.replace(/-/g, '').slice(0, 8), 16) % totalAvatarCount`. This gives each member a consistent avatar without a DB change.

## Payer Logic

- Default payer: current user
- Payer is excluded from the member avatar grid
- Changing payer: old payer re-appears in grid, new payer disappears
- If new payer was selected as split member, they get deselected from the split
- In edit mode: payer is locked, tapping shows toast

## Save Logic (Unchanged)

- Create: calls `create_expense_with_splits` RPC with description "Quick Expense"
- Edit: calls `edit_expense` RPC
- No-change detection preserved
- Confetti on first expense preserved
- Error handling preserved

## Edge Cases Handled

- Amount 0 + tap button on Slide 1: shake animation, no navigation
- No members selected on Slide 2: button fully disabled, no response
- Backdrop tap: closes drawer
- Back arrow on Slide 2: returns to Slide 1, amount preserved
- Amount changed after visiting Slide 2: custom amounts reset to equal on return
- Edit mode + settled expense: toast immediately, drawer does not open
- Double-tap save: loading state prevents
- Network error: destructive toast, drawer stays open on Slide 2

## Files Summary


| File                                          | Action                                         |
| --------------------------------------------- | ---------------------------------------------- |
| `src/assets/avatars/avatar01-05.svg`          | Copy from uploads                              |
| `src/components/expense/ExpenseSheet.tsx`     | Delete                                         |
| `src/components/expense/ExpenseScreen.tsx`    | Delete and rebuild                             |
| `src/components/expense/MemberAvatarGrid.tsx` | Create new                                     |
| `src/components/expense/PayerAvatar.tsx`      | Create new                                     |
| `src/components/expense/SplitSentence.tsx`    | Rebuild                                        |
| `src/components/expense/SaveButton.tsx`       | Rebuild                                        |
| `src/components/expense/NumpadGrid.tsx`       | Visual update                                  |
| `src/components/expense/AmountDisplay.tsx`    | Update for both slides                         |
| `src/components/expense/CustomSplitRows.tsx`  | Update avatar style                            |
| `src/index.css`                               | Add shake-x animation keyframes if not present |


No changes to: Dashboard.tsx, AppContext.tsx, any RPCs, ExpenseDetailSheet.tsx, settlement system, activity log, bountt-utils.ts, or the deprecated addExpense/calculateBalances.