# Fix Payer Logic and Cost Logging Edge Cases

## Root Cause

The bug is in `ExpenseScreen.tsx` lines 303-304. The payer is **hardcoded** to the current user:

```text
p_paid_by_user_id: user.id,        // Always current user
p_paid_by_name: payerName,          // Always current user's name
```

There is no payer selection UI. Every expense is saved as "Paid by [current user]" regardless of who actually paid. The `ExpenseCard` display logic is correct -- it just reads back what was stored.

## Solution

### 1. Add Payer State to ExpenseScreen (`src/components/expense/ExpenseScreen.tsx`)

- Add a `payerId` state (member ID), defaulting to the current user's member record
- On save, look up the selected payer's `user_id` and `name` from `activeMembers`
- Pass the correct `paid_by_user_id` (null for placeholders) and `paid_by_name` to the RPC

### 2. Create Payer Selector UI

Add a tappable payer label in the `SplitSentence` area that reads: **"You paid"** (default), tappable to cycle or open a picker showing all active members. When tapped, it changes to **"Kyle paid"**, **"Sarah paid"**, etc. Visual Feedback on Tap.

**Design**: Integrate it into the existing sentence: **"[You] paid, splitting equally with Kyle & Sarah"** -- where the payer name is a tappable button (same dotted-underline style as the "equally/custom" toggle).

### 3. Update SplitSentence Component (`src/components/expense/SplitSentence.tsx`)

- Accept new props: `payerMember`, `onCyclePayer`
- Display the payer name as a tappable button at the start of the sentence
- Cycle through `activeMembers` on tap (wrapping around)

### 4. Fix Save Logic (`src/components/expense/ExpenseScreen.tsx`)

Change lines 277-278 and 303-304:

```text
Before:
  p_paid_by_user_id: user.id,
  p_paid_by_name: payerName,   (always current user)

After:
  p_paid_by_user_id: selectedPayer.user_id,   (null for placeholders)
  p_paid_by_name: selectedPayer.name,
```

### 5. Filter $0 Splits in Equal Mode Too

Currently only custom mode filters $0 splits. Add the same filter for equal mode for consistency (though equal mode shouldn't produce $0 splits in practice).

## Files Modified


| File                                       | Change                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| `src/components/expense/ExpenseScreen.tsx` | Add `payerId` state, payer cycling logic, fix save to use selected payer |
| `src/components/expense/SplitSentence.tsx` | Add tappable payer name with cycle behavior                              |


## Edge Cases Handled

- **Payer is current user**: `paid_by_user_id = user.id` (default behavior, unchanged)
- **Payer is another real user**: `paid_by_user_id = their user_id`
- **Payer is a placeholder**: `paid_by_user_id = null`, `paid_by_name = placeholder name`
- **Payer removed while sheet open**: Payer resets to current user (activeMembers re-filters)
- **User excluded from split but is payer**: Allowed, they're owed the full amount
- **User neither payer nor in split**: Card shows actual payer name, no "You" anywhere
- **Reset on sheet open**: `payerId` resets to current user's member ID