# Bountt: Cost Entry Redesign + Cover Mode

## Phase 1 -- Database Migration

Add `expense_type` column to `expenses` table:

- `expense_type TEXT NOT NULL DEFAULT 'split' CHECK (expense_type IN ('split', 'cover'))`
- Backfill: existing rows get `'split'` via the DEFAULT automatically

Update two RPCs:

- `create_expense_with_splits`: Add `p_expense_type TEXT` parameter, store it on insert. Include `expense_type` in `expense_snapshot` JSONB.
- `edit_expense`: Add `p_expense_type TEXT` parameter, store it on update. Include `expense_type` in `expense_snapshot` JSONB.

Update the `Expense` TypeScript interface in `src/types/index.ts` to include `expense_type: 'split' | 'cover'`.

## Phase 2 -- Delete Dead Code

- Delete `src/components/dashboard/ExpenseSheet.tsx` entirely (confirmed unused/unimported)
- Remove the deprecated `calculateBalances` function from `bountt-utils.ts`
- Remove the `calculateBalances` wrapper from `AppContext.tsx` and the `calculateBalances` field from the context interface in `types/index.ts`
- Remove `BalanceSummary` type if no longer referenced

## Phase 3 -- 2-Step Flow (Drawer-Based)

**Fallback rule**: If converting to a Drawer component introduces any layout issues with the numpad or keyboard on mobile, keep the existing full-screen container and implement the 2-step flow within it instead.

The current `ExpenseScreen` is restructured into a bottom drawer (80% screen height) with two internal steps.

### Step 1 -- Amount Entry

- Rendered when `step === 1` (new state, default for create mode)
- Shows: top bar with title + close button, `AmountDisplay` (large format), `NumpadGrid`, and a continue arrow button at the bottom
- Continue arrow disabled when amount is `"0"`, enabled otherwise
- Tapping continue sets `step = 2`
- No sentence, no description, no split controls

### Step 2 -- Who + How

- Rendered when `step === 2`
- Top bar has a back arrow (returns to Step 1, preserves all state) and close button
- Compact read-only amount display at top (tapping it also returns to Step 1)
- Below: `SplitSentence` (updated for cover mode)
- Below: description input
- Below: `SaveButton`
- `CustomSplitRows` slides in when custom mode is active (same as current)

### Amount Change After Returning from Step 2

When the user taps back to Step 1 and changes the amount, then returns to Step 2: `distributeEqually` is explicitly called on the transition back to Step 2 if the amount differs from what it was when Step 2 was last shown. This is wired in the continue-arrow handler by comparing the current amount against a `lastStep2Amount` ref. If changed, `distributeEqually()` fires before setting `step = 2`.

### Edit Mode

- Skips Step 1 entirely -- opens directly on Step 2 with `step = 2`
- Amount is read-only (displayed at top, not tappable back to Step 1)

### Navigation

- Back arrow on Step 2 returns to Step 1 with amount and all Step 2 state preserved
- Closing the drawer entirely resets all state
- No progress dots or labels

## Phase 4 -- Cover Mode

### Derivation (no new state)

```text
const currentUserMemberId = activeMembers.find(m => m.user_id === user?.id)?.id;
const isCoverMode = currentUserMemberId ? !activeIds.has(currentUserMemberId) : false;
```

### Entering Cover Mode

- User taps their own "You" chip to deselect themselves
- On deselection: keep only one other member active (most recently selected), close custom split panel if open, reset `splitMode` to `"equal"`
- The "You" chip becomes ghosted (muted opacity, small x indicator) but remains visible

### Exiting Cover Mode

- Tapping the ghosted "You" chip re-adds them to `activeIds`, returning to split mode
- All chips re-select (all active members), sentence returns to normal

### Cover Mode Chip Rules

- Maximum one non-payer chip selected at a time
- Tapping a different person deselects the current one, selects the new one
- Tapping the ghosted "You" chip in cover mode shows toast: "You're covering this -- you're not in the split."

### Cover Mode + Payer

- Payer stored as `paid_by_user_id` as normal
- No split row created for payer (existing `.filter(s => s.share_amount > 0)` handles this)
- In cover mode the single covered member gets the full amount

### Cover Mode + Payer Change

- Cover mode persists. The covered person cannot be selected as payer (disabled in payer drawer).

### Edge Cases

- Cover mode impossible if `activeMembers.length <= 2` -- disable self-deselection
- Cover mode + edit: `isCoverMode` derived from `activeIds` automatically

## Phase 5 -- Sentence System Updates

Rewrite `SplitSentence.tsx` to handle all sentence states:


| State                   | Sentence                                       |
| ----------------------- | ---------------------------------------------- |
| Split equal, you paid   | "You paid, splitting equally with Kyle & Anya" |
| Split custom, you paid  | "You paid, splitting custom with Kyle & Anya"  |
| Split equal, other paid | "Kyle paid, splitting equally with you & Anya" |
| Cover, you paid         | "You paid, covering for Kyle"                  |
| Cover, other paid       | "Kyle paid, covering for you"                  |
| Solo (only you)         | "You paid . personal expense"                  |


- Accept `isCoverMode` prop
- When `isCoverMode` is true, hide the "equally"/"custom" toggle word entirely
- When `isCoverMode` is true, change "splitting ... with" to "covering for [single name]"
- All tappable words keep dotted underline treatment

## Phase 6 -- Save Button States

Update `SaveButton.tsx` to accept `isCoverMode` prop:

- Cover mode valid: label = "Cover it", orange
- Default split: label = "Save", orange
- Edit mode: label = "Save changes", orange
- Loading: "Saving...", disabled
- Custom not balanced: disabled, muted

## Phase 7 -- expense_type Propagation

### ExpenseCard.tsx

These are copy references only. Do not change card layout or structure.


| State                        | Label                               |
| ---------------------------- | ----------------------------------- |
| Split, you paid, >1          | You paid . split 3 ways             |
| Split, you paid, 1 person    | You paid . split with Kyle          |
| Split, someone paid, you owe | Kyle paid . you owe $12.50          |
| Split, not involved          | Kyle paid . between Anya & Jay      |
| Cover, you covered           | You covered . Jay owes you $25      |
| Cover, someone covered you   | Kyle covered . you owe Kyle $25     |
| Cover, not involved          | Kyle covered Jay . just so you know |
| Split settled, you paid      | You paid . all settled checkmark    |
| Split settled, you owed      | Kyle paid . settled checkmark       |
| Cover settled                | You covered . paid back checkmark   |


### ExpenseDetailSheet.tsx

- Section label: "Split breakdown" for split, "Covered for" for cover
- Payer label: "Kyle paid" for split, "Kyle covered" for cover

### ActivityLog.tsx

- Added split: "Doga added 'Tims Run' -- $18.00 split with Kyle & Anya"
- Added cover: "Doga covered 'Coffee run' for Kyle -- $8.00"

### AgingDebtSlide.tsx

- Split: existing language unchanged
- Cover: "You covered Kyle's coffee run 14 days ago. Still waiting."

## Phase 8 -- Bug Fixes

### handleKey stale closure

Add `customAmounts` and `activeIds` to the `useCallback` dependency array in `ExpenseScreen.tsx`.

### Deprecated calculateBalances

Remove entirely from `bountt-utils.ts`, `AppContext.tsx`, and `types/index.ts`.

### Edit mode custom split hydration

Add comment flagging as known debt: `// KNOWN DEBT: Edit mode always opens in equal mode, losing original custom split data`

## Phase 9 -- Edge Case Handling


| Scenario                                   | Behavior                                                                     |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| Amount changed after returning from Step 2 | `distributeEqually` called explicitly on Step 2 re-entry when amount differs |
| Cover mode, only 1 group member            | Disable self-deselection when `activeMembers.length <= 1`                    |
| Cover mode, payer = covered person         | Block in payer drawer: disable covered person as payer                       |
| Custom open, user deselects themselves     | Custom panel closes, cover mode activates                                    |
| Re-add self                                | Split mode returns, equal split recalculates                                 |
| Solo expense                               | Save blocked, sentence: "You paid . personal expense"                        |
| Tapping ghosted You chip                   | Toast only, no mode change                                                   |
| Cover + second person chip                 | Deselect current, select new (one max)                                       |
| Description empty                          | Defaults to "Quick Expense"                                                  |
| Edit cover expense                         | `isCoverMode` activates via derived state, payer locked                      |


## Files Changed Summary


| File                                                 | Action                                                                                          |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `supabase/migrations/`                               | New migration: add `expense_type` column, update RPCs                                           |
| `src/types/index.ts`                                 | Add `expense_type` to Expense, remove `calculateBalances` from context, remove `BalanceSummary` |
| `src/components/dashboard/ExpenseSheet.tsx`          | DELETE                                                                                          |
| `src/lib/bountt-utils.ts`                            | Remove deprecated `calculateBalances`                                                           |
| `src/contexts/AppContext.tsx`                        | Remove `calculateBalances`                                                                      |
| `src/components/expense/ExpenseScreen.tsx`           | 2-step flow, drawer container (with full-screen fallback), cover mode logic, handleKey fix      |
| `src/components/expense/AmountDisplay.tsx`           | Add compact read-only variant for Step 2                                                        |
| `src/components/expense/SplitSentence.tsx`           | Cover mode sentences, hide equally/custom in cover                                              |
| `src/components/expense/SaveButton.tsx`              | Cover mode label                                                                                |
| `src/components/dashboard/ExpenseCard.tsx`           | expense_type-aware labels per copy table                                                        |
| `src/components/dashboard/ExpenseDetailSheet.tsx`    | expense_type-aware section labels                                                               |
| `src/pages/ActivityLog.tsx`                          | Cover-aware activity text                                                                       |
| `src/components/dashboard/slides/AgingDebtSlide.tsx` | Cover-aware aging debt text                                                                     |
| `src/pages/Dashboard.tsx`                            | Pass updated ExpenseScreen props                                                                |


## What Is NOT Changed

- Numpad key logic and `distributeCents` algorithm
- RPC JSONB shape for splits (only `p_expense_type` added)
- Settlement flows
- Activity log DB structure (only language rendering)
- Payer drawer component internals
- `isFirstExpense` confetti behavior
- AppContext realtime subscriptions
- Any RLS policies
- Card layout or structure (only copy/labels change)