

# Bountt Settlement System

## Overview

Build per-split settlement with two RPCs (`settle_my_share`, `settle_all`), update balance calculations to exclude settled splits, add settlement UI to the expense detail sheet, implement a PayPal return confirmation flow in the hero, and extend the activity log with the `settled` action type.

---

## Phase 1: Database Migration

A single migration that:

1. **Add columns to `expense_splits`:**
   - `is_settled BOOLEAN NOT NULL DEFAULT false`
   - `settled_at TIMESTAMPTZ`

2. **Update `activity_log` CHECK constraint** to include `'settled'`:
   ```sql
   ALTER TABLE activity_log DROP CONSTRAINT IF EXISTS activity_log_action_type_check;
   ALTER TABLE activity_log ADD CONSTRAINT activity_log_action_type_check
   CHECK (action_type IN ('added', 'edited', 'deleted', 'joined', 'settled'));
   ```

3. **Create `settle_my_share` RPC:**
   - Derives `actor_id` from `auth.uid()` (never trusts client)
   - Finds split where `expense_id = p_expense_id AND user_id = auth.uid()`
   - Validates: not found -> error, already settled -> error
   - Sets `is_settled = true, settled_at = now()` on that split
   - Checks if ALL splits for this expense are now settled; if so, sets `expenses.is_settled = true`
   - Fetches actor display name from `profiles`
   - Inserts `activity_log` entry with `action_type = 'settled'`, snapshot, and `change_detail = [{ field: 'settled_by', old_value: '', new_value: actor_name }]`

4. **Create `settle_all` RPC:**
   - Derives `actor_id` from `auth.uid()`
   - Verifies `paid_by_user_id = auth.uid()` (only payer can settle all)
   - Validates: already fully settled -> error
   - Sets `is_settled = true, settled_at = now()` on ALL splits for this expense
   - Sets `expenses.is_settled = true, updated_at = now()`
   - Inserts `activity_log` entry with `action_type = 'settled'`, snapshot, and `change_detail = [{ field: 'settled_all', ... }]`

Both RPCs run inside implicit PL/pgSQL transactions (atomic).

---

## Phase 2: Balance Recalculation

### `src/components/dashboard/slides/useHeroData.ts`

The current code filters expenses by `!e.is_settled` (expense-level), but now settlement is per-split. Update the balance logic to filter at the **split level** using `is_settled` on each split row:

- When iterating unsettled expenses, for each split, additionally check `s.is_settled !== true` before adding to `totalOwedToYou` / `totalYouOwe` / `debtsYouOwe` / `agingDebts`
- Keep the expense-level `!e.is_settled` filter for the outer loop (settled expenses are fully done), but within partially-settled expenses, skip individual settled splits
- This requires updating the `ExpenseSplit` type first

### `src/types/index.ts`

Add to `ExpenseSplit`:
```typescript
is_settled: boolean;
settled_at: string | null;
```

Update `ActivityLog.action_type` to include `'settled'`.

---

## Phase 3: Expense Detail Sheet Updates

### `src/components/dashboard/ExpenseDetailSheet.tsx`

Major additions to the existing sheet:

**State derivations:**
- `isPayer = expense.paid_by_user_id === user?.id`
- `mySplit = expenseSplits.find(s => s.user_id === user?.id)`
- `iAlreadySettled = mySplit?.is_settled === true`
- `expenseFullySettled = expense.is_settled === true`

**Rendering changes:**

1. If `expenseFullySettled`: show green "Settled" badge below title. Hide edit/delete buttons entirely. Sheet is read-only.

2. In split breakdown rows: if a split's `is_settled`, show a muted "Settled" label next to the amount. For the current user's row specifically, show "Your share settled" in green if settled.

3. **Settlement action buttons** (below the split breakdown, only if not fully settled):
   - If `mySplit` exists and `!iAlreadySettled`: "Settle my share" button (dark, full width). On tap, show inline confirmation:
     - "Did you send $[amount] to [paid_by_name]?"
     - "Yes, I sent it" (orange) -> calls `settle_my_share` RPC
     - "I'll do it later" (muted text) -> dismiss
   - If `isPayer` and `!expenseFullySettled`: "Settle all" button (outlined). One tap, no confirmation -> calls `settle_all` RPC

4. On RPC success: refresh expenses + splits, close or update sheet, show toast
5. On RPC error: show inline error, keep sheet open

---

## Phase 4: PayPal Return Confirmation

### `src/components/dashboard/slides/NetBalanceSlide.tsx`

The "Pay [name]" / "Settle Up" button currently does nothing (no onClick handler). Add:

1. **State:** `pendingDebt: { expenseId, amount, payeeName } | null` and `showPayConfirm: boolean`

2. **On CTA click:**
   - For "you_owe" debts: store `pendingDebt` with the debt details, then open PayPal deeplink (`https://paypal.me/...` or just a generic payment prompt). Set a `paypalTriggered` flag.
   - For "owed_to_you" debts: call `settle_my_share` directly (since you're the payer settling someone else's debt -- actually no, `settle_all` would be more appropriate here). Actually per the spec, "Settle Up" for owed_to_you should call `settle_all`. "Pay [name]" for you_owe should deeplink to PayPal.

3. **Visibility change detection:** Add a `visibilitychange` / `focus` listener. When app regains focus AND `paypalTriggered` is true, show the confirmation prompt.

4. **Confirmation prompt** (rendered as a fixed bottom overlay or inline in the hero):
   - "Did you send $[amount] to [name]?"
   - "Yes, I sent it" -> calls `settle_my_share(expenseId)` -> dismiss + recalculate
   - "Not yet" -> dismiss, clear flag

5. For "Settle Up" (owed_to_you): call `settle_all` RPC directly on tap, show toast. No PayPal flow needed.

---

## Phase 5: Activity Log Updates

### `src/pages/ActivityLog.tsx`

1. Add `'settled'` to `ActivityLogEntry.action_type` union
2. Add to `ACTION_CONFIG`:
   ```
   settled: { icon: Check, bg: "bg-emerald-100", pillBg: "bg-emerald-50", pillText: "text-emerald-700" }
   ```
   (green tint icon bg `#F0FFF7`, green icon color `#00A857`)

3. In `ActivityCard`, handle the settled action type:
   - Check `change_detail[0].field`:
     - `'settled_by'` -> "[Actor] settled their share of "[description]" -- $[share amount]"
     - `'settled_all'` -> "[Actor] settled "[description]" for everyone -- $[total amount]"
   - Green pill with appropriate text

---

## Phase 6: Realtime Wiring

The existing `AppContext` already:
- Subscribes to `expenses` realtime changes and re-fetches splits on any expense change
- `expense_splits` is already in the realtime publication

Add a realtime subscription for `expense_splits` changes in `AppContext.tsx` so that when splits are updated (settlement), the local state refreshes without needing an expense change event. This ensures balance recalculation is instant.

---

## File Summary

| File | Change |
|------|--------|
| Migration SQL | Add columns, update constraint, create 2 RPCs |
| `src/types/index.ts` | Add `is_settled`, `settled_at` to ExpenseSplit; add `'settled'` to ActivityLog |
| `src/components/dashboard/slides/useHeroData.ts` | Filter settled splits from balance calculations |
| `src/components/dashboard/ExpenseDetailSheet.tsx` | Settlement UI: badges, inline confirm, RPC calls |
| `src/components/dashboard/slides/NetBalanceSlide.tsx` | PayPal deeplink, return confirmation prompt |
| `src/pages/ActivityLog.tsx` | Add settled action type config + rendering |
| `src/contexts/AppContext.tsx` | Add expense_splits realtime subscription |

---

## Edge Cases

- Non-payer calls `settle_all` -> RPC throws, UI shows error toast
- Already-settled split -> RPC throws "Already settled"
- All splits individually settled -> `expenses.is_settled` auto-flips, `settle_all` would throw "Already fully settled"
- Settled expense -> edit/delete hidden, sheet read-only
- User has no split on expense -> no settlement buttons shown
- PayPal prompt dismissed with "Not yet" -> no RPC, flag cleared
- PayPal prompt RPC failure -> error shown in prompt, stays open for retry
- Balance recalculation -> driven by realtime on both expenses and expense_splits tables

