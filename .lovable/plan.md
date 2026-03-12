Expense Detail Sheet Rebuild — Implementation Plan

## DB Migration (Step 1)

Two changes in one migration:

**New RPC: `settle_member_share**`

- Parameters: `p_expense_id UUID`, `p_split_id UUID`
- Verifies `auth.uid() = expenses.paid_by_user_id` (payer only)
- Verifies split belongs to this expense and `is_settled = false`
- Sets `is_settled = true, settled_at = now()` on that split
- Checks if all splits now settled → if so, sets `expense.is_settled = true`
- Writes activity_log entry with settled member's name and share amount
- `LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`

**Index on activity_log for per-expense queries:**

```sql
CREATE INDEX idx_activity_log_expense_id
ON activity_log (group_id, ((expense_snapshot->>'expense_id')));
```

This prevents full table scans when fetching activity entries for a specific expense.

## New Component: `src/components/dashboard/ExpenseSpokeViz.tsx` (Step 2)

Props: `payer` (GroupMember or null), `payerName`, `totalAmount`, `members` (array of `{splitId, name, userId, shareAmount, iSettled, member: GroupMember | null}`), `currentUserId`, `isPayer`, `onMemberTap(splitId, memberName, shareAmount)`.

Layout:

- Payer avatar (56px) centered at top with label "You paid · $X" or "[Name] paid · $X"
- Dashed SVG lines radiating to member avatars below
- Member avatars (48px) positioned on a 160° arc using `Math.cos`/`Math.sin` with even angular distribution
- Arc radius scales to fit 320px min width; works for 1–6 members
- Settled members: checkmark badge (dark navy circle, white check icon), `opacity-60` on avatar
- Unsettled members: full opacity, tappable per rules

Tap rules (enforced in component):

- `currentUserId === member.userId && !settled` → fires `onMemberTap` immediately
- `isPayer && member.userId !== currentUserId && !settled` → fires `onMemberTap` 
- All other cases → no action, no pointer cursor

Colors: uses `getAvatarColor`/`getAvatarImage` from avatar-utils. No red/green anywhere.

## New Component: `src/components/dashboard/ExpenseSettledState.tsx` (Step 3)

Props: `members` (array of `{name, member: GroupMember | null}`).

- Large circle (80px) with dark navy/foreground background, white checkmark icon centered
- Bold "All settled up!" text below
- Horizontal avatar stack: 40px circles, overlapping with `-ml-3`, using member colors/images
- Replaces spoke viz when `expense.is_settled === true`

## Per-Expense Activity Log (Step 4, inside ExpenseDetailSheet)

- On sheet open, query `activity_log` where `group_id = currentGroup.id` and `expense_snapshot->>'expense_id' = expense.id`, ordered by `created_at DESC`
- Renders at bottom of sheet in all states
- Settlement rows: `[date] · [Name] Settled Share · $[amount]` — "You" for current user
- Original payment row at bottom: `[date] · [Payer] Paid · $[total]`
- Realtime: subscribe to `activity_log` INSERT events filtered by group_id; append matching entries live

## Rebuild `ExpenseDetailSheet.tsx` (Step 5)

**Keep:** Drawer container, delete flow + confirmation, `handleSettleMyShare`, `handleSettleAll`, props interface, state reset on close.

**New layout (top to bottom):**

1. **Header row:** `[description] · $[amount]` — edit + delete icons top-right
  - Edit: hidden when `expense.is_settled`
  - Delete: visible to creator only (always, even when settled)
2. **Subtitle:** "[Payer] paid, splitting with [M1] & [M2]" — "You" for current user
3. **Date + creator:** "[date] · Added by [name]" — "Added by you" if current user
4. **Divider**
5. **Visualization:** `ExpenseSettledState` if fully settled, else `ExpenseSpokeViz`
6. **Confirmation modal** (When the payer taps an unsettled member's avatar, show a popover anchored directly below that avatar — not a full-screen modal overlay, not an inline card in the sheet layout. The popover floats above the content, positioned under the tapped avatar. ): triggered when payer taps another member's avatar via `onMemberTap`. Shows "[Name] still owes $[amount], do you want to settle it up?" with Confirm (calls new `settle_member_share` RPC) and Cancel buttons.  

7. **Slide-to-settle / Hold-to-settle:** Payer-only, hidden when fully settled. For the slide-to-settle interaction, build a custom swipe gesture component — do not substitute hold-to-confirm. The UI shows a pill-shaped track with a draggable button (>> arrow) on the left. User drags it to the right edge to confirm. On release before the right edge, it snaps back. On reaching the right edge, it locks and calls settle_all. This is pure CSS + pointer/touch events, no library needed., then calls `settle_all`
8. **Activity log section** at bottom

**Tap flow for current user's own avatar:** calls `handleSettleMyShare` directly (no modal, per spec). This is intentional — one-way, no undo. 

## Step 6 — Cleanup

Remove from the rebuilt `ExpenseDetailSheet`:

- Old flat-list split breakdown (colored dots + rows)
- Old "Settle my share" button + confirmation flow
- Old "Settle all" button
- Green `emerald` checkmark badge + "Settled" text
- `settleConfirm` state (replaced by avatar tap)

`ExpenseCard.tsx` left untouched (unused by Dashboard but may be referenced elsewhere).

## Risk Flags

- `**settle_member_share` is new** — SECURITY DEFINER, same pattern as existing RPCs. Low risk.
- **Activity log JSONB index** — expression index on `expense_snapshot->>'expense_id'` handles the performance concern raised. Must be created before the query goes live.
- **No undo on self-settlement** — confirmed as spec-intended. One-way action via avatar tap.
- **Spoke layout at 320px** — arc radius of ~100px with 48px avatars fits 6 members. Will need testing at boundary.

## Files Changed


| File                                               | Action          |
| -------------------------------------------------- | --------------- |
| `supabase/migrations/[new].sql`                    | New RPC + index |
| `src/components/dashboard/ExpenseSpokeViz.tsx`     | Create          |
| `src/components/dashboard/ExpenseSettledState.tsx` | Create          |
| `src/components/dashboard/ExpenseDetailSheet.tsx`  | Full rebuild    |


No changes to: AppContext, Dashboard.tsx, RPCs (settle_my_share, settle_all, delete_expense), types, avatar-utils, bountt-utils.