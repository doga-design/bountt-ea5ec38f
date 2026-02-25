# Bountt Cost Management System

## Overview

Build three interconnected features: expense editing, expense deletion, and a group-wide activity log. This involves database schema changes, three new RPCs, UI for editing/deleting expenses, an activity log screen, and wiring it all together.

---

## Phase 1: Database Changes

### 1a. CASCADE foreign key on expense_splits

Add a foreign key constraint so deleting an expense automatically removes its splits:

```sql
ALTER TABLE expense_splits
ADD CONSTRAINT expense_splits_expense_id_fkey
FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE;
```

### 1b. Create activity_log table

```sql
CREATE TABLE activity_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        uuid NOT NULL,
  actor_id        uuid NOT NULL,
  actor_name      text NOT NULL,
  action_type     text NOT NULL CHECK (action_type IN ('added', 'edited', 'deleted', 'joined')),
  expense_snapshot jsonb,
  change_detail   jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- SELECT: group members only
CREATE POLICY "Group members can view activity log"
ON activity_log FOR SELECT
USING (is_group_member(group_id, auth.uid()));

-- No direct INSERT/UPDATE/DELETE from clients -- handled via RPCs
```

Enable realtime on activity_log:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;
```

### 1c. Update create_expense_with_splits to log "added"

Modify the existing RPC to also insert an activity_log row with action_type = 'added' and a snapshot of the expense + member names after creating the expense.

---

## Phase 2: New RPCs

### 2a. edit_expense RPC

**Parameters:** `p_expense_id`, `p_amount`, `p_description`, `p_splits` (jsonb), `p_actor_id`, `p_actor_name`  
  
**In all RPCs, derive `actor_id` from `auth.uid()` server-side. Do not trust `p_actor_id` from the client.**

**Logic (single transaction):**

1. Verify `created_by = p_actor_id` on the expense (throw if not)
2. Check `is_settled = false` (throw if settled)
3. Fetch old expense row + old splits for change detection
4. `UPDATE expenses SET amount, description, updated_at`
5. `DELETE FROM expense_splits WHERE expense_id = p_expense_id`
6. `INSERT` new splits from `p_splits`
7. Compare old vs new: amount (abs diff > 0.001), description (string compare), members (sorted name arrays)
8. For each changed field, insert one `activity_log` row with action_type = 'edited' and the appropriate `change_detail`
9. Return the updated expense as JSONB

### 2b. delete_expense RPC

**Parameters:** `p_expense_id`, `p_actor_id`, `p_actor_name`

**Logic (single transaction):**

1. Verify `created_by = p_actor_id` (throw if not)
2. Fetch expense + split member names BEFORE delete
3. Insert `activity_log` row: action_type = 'deleted', full expense_snapshot with member_names
4. `DELETE FROM expenses WHERE id = p_expense_id` (splits cascade)
5. Return success

### 2c. log_member_joined RPC

**Parameters:** `p_group_id`, `p_actor_id`, `p_actor_name`

**Logic:**

1. Insert `activity_log` row: action_type = 'joined', expense_snapshot = null, change_detail = null

---

## Phase 3: TypeScript Types

### `src/types/index.ts`

Add `ActivityLog` interface:

```typescript
export interface ActivityLog {
  id: string;
  group_id: string;
  actor_id: string;
  actor_name: string;
  action_type: 'added' | 'edited' | 'deleted' | 'joined';
  expense_snapshot: {
    expense_id: string;
    description: string;
    amount: number;
    paid_by_name: string;
    member_names: string[];
  } | null;
  change_detail: Array<{
    field: string;
    old_value: string;
    new_value: string;
  }> | null;
  created_at: string;
}
```

---

## Phase 4: Expense Detail Bottom Sheet

### New component: `src/components/dashboard/ExpenseDetailSheet.tsx`

Currently `ExpenseCard` has no tap action. Add an `onClick` to each `ExpenseCard` that opens a new bottom sheet (Drawer) showing expense details.

**Sheet contents:**

- Expense description (title)
- Amount
- "Paid by [Name]" label
- Split breakdown (list of members + amounts)
- Date
- **If `expense.created_by === currentUser.id`:**
  - "Edit expense" button (navigates to edit screen)
  - Trash icon button (triggers delete confirmation)
- **If not creator:**
  - "Logged by [Name]" badge (read-only)

**Delete confirmation (within the sheet):**

- Slides up within the bottom sheet
- Shows: "Delete this expense?" + expense name + warning text
- "Yes, delete it" (red) and "Keep it" (gray) buttons
- On confirm: calls `delete_expense` RPC, closes sheet, refreshes feed, shows toast "Expense deleted"
- On error: shows error message within confirmation layer

---

## Phase 5: Edit Expense Screen

### Modified: `src/components/expense/ExpenseScreen.tsx`

Add an `editExpense` prop to reuse the existing screen in edit mode:

```typescript
interface ExpenseScreenProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFirstExpense?: boolean;
  editExpense?: Expense;       // NEW
  editSplits?: ExpenseSplit[]; // NEW
}
```

**When `editExpense` is provided:**

- Title changes to "Editing cost"
- Pre-fill amount from `editExpense.amount` *(This the right tradeoff given split mode isn't stored — just make sure the UI makes it obvious the split was reset, maybe a small notice: "Split recalculated equally — adjust if needed.")*
- Pre-fill description from `editExpense.description`
- Pre-fill `activeIds` from `editSplits` member IDs (matched to current groupMembers)
- Split mode opens as "equal" (redistributed from current amount)
- Payer display: non-interactive "Paid by [Name]" label with lock icon below the amount. Tapping shows a toast: "To change the payer, delete this expense and log a new one"
- Payer selection drawer is hidden
- `handleSetPayer` is disabled
- SaveButton label: "Save changes"
- On save: call `edit_expense` RPC instead of `create_expense_with_splits`
- On success: close screen, refresh feed + splits, show toast "Changes saved"
- On error: show inline error, stay on screen
- If `is_settled === true`: block edit, show message "This expense has been settled and can't be edited"
- No-change detection: compare old vs new before calling RPC; if nothing changed, just close without RPC call

---

## Phase 6: Activity Log Screen

### New page: `src/pages/ActivityLog.tsx`

**Route:** `/groups/:groupId/activity` (add to App.tsx)

**Screen structure:**

- Back chevron + title "Activity log"
- Subtitle: "Every change, visible to all members"
- Feed: query `activity_log WHERE group_id = currentGroup.id ORDER BY created_at DESC LIMIT 100`
- Grouped by date (TODAY, YESTERDAY, etc.) using existing `formatRelativeDate`
- Empty state: icon + "Nothing yet. Activity will appear here when expenses are added, edited, or deleted."

**Each entry card:**

- Left: colored icon square (36x36, rounded)
  - added = green + plus icon
  - edited = blue + pencil icon
  - deleted = red + trash icon
  - joined = orange + person icon
- Body: "[Actor] [action] "[description]" -- [amount]"
  - Actor name: bold, #D94F00
  - Expense name: bold black
  - Amount: bold black
- Detail pills:
  - edited: blue bg, "amount $X -> $Y" or "removed [Name] from split" etc.
  - deleted: red pill, "split between [names]"
  - added: green pill, "split with [names]"
  - joined: no pill, just "[Name] joined the group"
- Right: relative timestamp ("2h ago", "Yesterday")

**Realtime:** Subscribe to `activity_log` changes for the current group so new entries appear at top without refresh.

---

## Phase 7: Settings Integration

### Modified: `src/components/group-settings/SettingsCards.tsx`

Add a "Transparency" section between the current Settings cards and DangerZone:

```text
[icon] Activity log
       Every change, visible to all members     >
```

- Icon: document icon, orange bg (#FFF0E8), orange stroke (#D94F00)
- Tapping navigates to `/groups/:groupId/activity`

---

## Phase 8: Join Flow -- Log Member Joined

### Modified: `src/pages/Join.tsx`

After successful join (both `joinAsNewMember` and `handlePlaceholderSelection`), call the `log_member_joined` RPC with the user's ID and display name.

---

## Phase 9: Wiring & State

### Modified: `src/contexts/AppContext.tsx`

No major changes needed -- the existing realtime subscription on `expenses` already handles UPDATE and DELETE events. The `fetchExpenses` and `fetchExpenseSplits` functions will be called after edit/delete RPCs to refresh state.

### Dashboard changes

- `ExpenseCard` gets an `onClick` prop to open the detail sheet
- `Dashboard.tsx` manages state for the selected expense and the detail sheet

---

## File Summary


| File                                              | Action                                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Database migration                                | CASCADE FK, activity_log table, RLS, realtime                                              |
| Database RPCs                                     | `edit_expense`, `delete_expense`, `log_member_joined`, update `create_expense_with_splits` |
| `src/types/index.ts`                              | Add `ActivityLog` type                                                                     |
| `src/components/dashboard/ExpenseDetailSheet.tsx` | New -- expense detail bottom sheet with edit/delete                                        |
| `src/components/expense/ExpenseScreen.tsx`        | Add edit mode (editExpense prop, locked payer, save changes)                               |
| `src/components/expense/SaveButton.tsx`           | Accept optional `label` prop for "Save changes"                                            |
| `src/pages/ActivityLog.tsx`                       | New -- full activity log page                                                              |
| `src/pages/Dashboard.tsx`                         | Wire ExpenseCard onClick to detail sheet                                                   |
| `src/components/dashboard/ExpenseCard.tsx`        | Add onClick prop                                                                           |
| `src/components/group-settings/SettingsCards.tsx` | Add Activity log row                                                                       |
| `src/App.tsx`                                     | Add `/groups/:groupId/activity` route                                                      |
| `src/pages/Join.tsx`                              | Call `log_member_joined` after join                                                        |


---

## Edge Cases Handled

- **Non-creator views expense**: Edit/delete hidden, "Logged by [Name]" badge shown
- **Settled expense edit blocked**: Check `is_settled` before allowing edit
- **No changes on edit**: Detect diff client-side, skip RPC if nothing changed
- **Network errors**: Keep UI open, show error inline
- **Activity log empty**: Show empty state message
- **Multiple fields changed**: One activity_log row per changed field, same timestamp
- **Member added/removed from split**: Logged as "added [Name] to split" / "removed [Name] from split"
- **Actor name snapshot**: Always stored at write time, not referenced from live profiles