# Bountt Cost Logging Flow Rebuild

## Overview

Complete rebuild of the expense entry system from a single full-screen view into a two-slide bottom drawer with new visual design matching the provided reference images. Includes adding SVG avatar assets, new member selection grid, and payer avatar component.

## Files to Delete

- `src/components/expense/ExpenseSheet.tsx` (dead code)

## Files to Create

### 1. Avatar Assets (`src/assets/avatars/`)

Copy all 5 uploaded PNG files into `src/assets/avatars/` as `avatar1.png` through `avatar5.png`. Import them as static assets: `import Avatar1 from './avatar1.png'`. Do not use SVG component imports or `?react` pattern anywhere.

### 2. `src/components/expense/MemberAvatarGrid.tsx` (New)

Horizontal row of tappable circular avatars for Slide 2:

- Receives all active members EXCEPT the current payer
- Each avatar: circular image using the member's assigned avatar asset, with their `avatar_color` as background
- Deselected state: grayscale filter on avatar
- Selected state: full color, white border ring
- Name label below each avatar (bold)
- Dynamic sizing: avatars shrink as member count increases (fit single row, no wrapping)
- "+" button rendered at the end of the row (visual only, no handler)
- Tapping toggles `activeIds` via parent callback

### 3. `src/components/expense/PayerAvatar.tsx` (New)

Small circular avatar (44px) displayed next to the amount on Slide 2:

- Shows the current payer's assigned avatar image with their `avatar_color` background
- Tappable: opens payer selector drawer (disabled in edit mode)

### 4. Avatar Assignment Utility

Add to `src/lib/avatar-utils.ts`:

- `AVATAR_IMAGES`: array of the 5 imported PNG paths in order. `getAvatarImage(member)`: returns `AVATAR_IMAGES[parseInt(member.id.replace(/-/g,'').slice(0,8), 16) % AVATAR_IMAGES.length]` — this is the exact formula, do not deviate. Return type is a string (image src). This function must be used everywhere avatars render: MemberAvatarGrid, PayerAvatar, ExpenseDetailSheet, ActivityLog, MemberCards. Same member always gets same avatar on every device and session.

## Files to Rebuild

### 5. `src/components/expense/ExpenseScreen.tsx` (Delete + Rebuild)

Complete rewrite. New architecture:

**Props**: Same interface (`open`, `onOpenChange`, `isFirstExpense`, `editExpense`, `editSplits`)

**State**:

- `slide`: 1 or 2 (current visible slide)
- `amount`, `splitMode`, `activeIds`, `focusedMemberId`, `customAmounts`, `freshFocus`, `shakeMemberId`, `payerId`, `loading` -- all carried over
- `prevAmount`: tracks amount when leaving Slide 1, used to detect changes on return
- Remove: `description`, `editingTotal` (no longer needed)
- Member list snapshot: `useRef` capturing `activeMembers` when drawer opens, not updating mid-session

**Layout**: Fixed-height drawer overlay (not full screen), approximately 85dvh:

- Dark backdrop (`#000000` at 60% opacity, `backdrop-blur-sm`), tapping closes drawer
- White rounded-top container with slide content
- CSS transition: slides move horizontally via `translateX`

**Slide 1** (Amount Entry):

- Drag handle pill centered at top
- "What did **you** pay?" headline ("you" in orange `#D94F00`, dotted underline, tappable to open payer drawer)
- Amount display: large `$XX` with blinking orange cursor, Sora font
- "I am covering for someone" text with circular arrow icon (visual only)
- "Log cost +" / "Log cost ->" button:
  - Disabled (amount=0): gray `#EAEAE6`, arrow icon, shake on tap
  - Active (amount>0): orange `#D94F00`, "+" icon, navigates to Slide 2
- NumpadGrid at bottom

**Slide 2** (Split Config):

- Back arrow (top-left, circular border) -> returns to Slide 1, preserves amount
- Drag handle pill
- Amount display (slightly smaller) + PayerAvatar to the right
- Split sentence: "[Payer] paid, splitting [equally/custom] with [names]"
- MemberAvatarGrid (all members except payer)
- In custom mode: CustomSplitRows replaces/appears below the avatar grid, numpad visible at bottom
- "I am covering for someone" (visual only)
- "Log cost +" button:
  - Disabled (no members selected): gray, non-interactive, no animation
  - Active (1+ selected): orange, saves expense on tap

**Slide transitions**:

- Slide 1 -> 2: triggered by "Log cost +" when active. Amount is snapshotted in `prevAmount`
- Slide 2 -> 1: back arrow. On return to Slide 2, if amount changed, custom amounts reset to equal, selected members preserved
- Payer change on Slide 2: old payer re-enters grid, new payer exits grid, if new payer was selected as split member they get deselected

**Save logic**: Identical to current -- calls `create_expense_with_splits` or `edit_expense` RPC. Description hardcoded to "Quick Expense". All existing confetti, toast, error handling, no-change detection preserved.

**Edit mode specifics**: Payer locked (toast on tap), settled check on open, pre-fill amount and members, save label unchanged.

**Bug fixes included**:

- `handleKey` dependency array: add `customAmounts` and `activeIds`
- Remove `isSingleUser` path (impossible state in new flow)

### 6. `src/components/expense/SplitSentence.tsx` (Rebuild)

Simplified for Slide 2 context:

- No more drawer-based member selection (that's now the avatar grid)
- Renders: "[Payer] paid, splitting [mode] with [names]"
- Payer name: orange, dotted underline, tappable -> opens payer drawer
- Mode toggle: orange "equally" / blue "custom", tappable
- Names list: bold black, "No one" when empty
- Payer selector drawer stays inside this component (reuse existing drawer pattern)

### 7. `src/components/expense/SaveButton.tsx` (Rebuild)

Two distinct states matching the designs:

- **Disabled**: gray background `#EAEAE6`, muted text, arrow icon "->", no tap response (completely inert on Slide 2; shake animation on Slide 1)
- **Active**: orange `#D94F00` background, white text, "+" icon, full interaction
- Label: "Log cost" (not "Save")
- Edit mode label: "Save changes"
- Rounded pill shape (18px border radius), full width

### 8. `src/components/expense/NumpadGrid.tsx` (Update Visual Style)

Keep all key logic unchanged. Update styling:

- Keys: light gray rounded rectangles with soft shadow (not flat grid cells)
- More padding/spacing between keys
- Maintain sub-letters on 2-9 keys
- Backspace icon stays

### 9. `src/components/expense/AmountDisplay.tsx` (Update)

- Remove the custom-mode "TOTAL" variant (that's handled differently now)
- Keep the distribute/remaining pill for custom mode on Slide 2
- Add blinking orange cursor on Slide 1

### 10. `src/components/expense/CustomSplitRows.tsx` (Update)

### Avatar files are PNGs. Use `<img src={getAvatarImage(member)} />` inside a circular div with `member.avatar_color` as background. Do not change any custom split logic, math, or state management.

Update to match Image 5 design:

- Large circular avatar (~80px) on the left using the SVG avatar images
- Amount in a rounded box to the right
- Rows separated by hairline dividers
- Member name below avatar (orange for "You", black for others)

## AppContext Fix (Minimal Change)

In the expense_splits realtime channel handler, add a client-side guard after receiving any INSERT/UPDATE/DELETE event: check if `payload.new?.expense_id` or `payload.old?.expense_id` exists in the current local `expenseSplits` array. If not found, ignore the event entirely. Do not add `filter: 'group_id=eq.${groupId}'` to the channel — expense_splits has no group_id column and this will silently fail.

## Technical Details

### Avatar Assignment Strategy

- 5 avatar images, assigned deterministically via hash of member ID
- `getAvatarImage(member)` returns the import path
- Avatar color (existing `avatar_color` field) used as the circular background behind the avatar image

### Member Snapshot

- When drawer opens (`open` changes to `true`), snapshot `activeMembers` into a ref
- All member operations within the drawer use this snapshot
- Prevents mid-session member additions from appearing

### State Flow for Payer Change

1. User taps payer name/avatar -> payer drawer opens
2. Selects new payer (member B)
3. `payerId` updates to B's member ID
4. B removed from avatar grid (grid shows everyone except payer)
5. If B was in `activeIds`, remove B from `activeIds`
6. Old payer A re-appears in grid (default: deselected/grayscale)
7. Split sentence updates

### Slide Navigation State Machine

```text
[CLOSED] --open=true--> [SLIDE 1: AMOUNT]
[SLIDE 1] --"Log cost+" (amount>0)--> [SLIDE 2: SPLIT]
[SLIDE 1] --"Log cost+" (amount=0)--> [SHAKE, stay on SLIDE 1]
[SLIDE 2] --back arrow--> [SLIDE 1] (amount preserved)
[SLIDE 1] --amount changed, go to SLIDE 2--> [custom amounts reset to equal]
[SLIDE 2] --"Log cost+" (members selected)--> [SAVING] --> [CLOSED]
[SLIDE 2] --"Log cost+" (no members)--> [NO RESPONSE]
[ANY] --backdrop tap--> [CLOSED]
```

### Edge Cases Handled

- Amount 0 + tap button on Slide 1: shake animation, no navigation
- No members selected on Slide 2: button fully disabled, no response
- Back to Slide 1 then change amount: custom amounts reset on return to Slide 2
- Payer was a selected split member: auto-deselect on payer change
- Edit mode settled expense: toast + close immediately on open
- Double tap save: `loading` state prevents
- Network error: destructive toast, stay on Slide 2