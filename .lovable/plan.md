# Fix 6 Confirmed Bugs — Single Pass

## Fix 1 — Placeholder payer split row leaks into database (CRITICAL)

**Client side — `ExpenseScreen.tsx` line 481:**
Replace the filter with a NULL-safe version using `paidByName` (available at line 457):

```typescript
splits = splits.filter((s) => {
  if (paidByUserId) return s.user_id !== paidByUserId;
  return s.member_name !== paidByName;
});
```

**Server side — DB migration for both RPCs:**

In `create_expense_with_splits`, replace the safety-net DELETE:

```sql
DELETE FROM expense_splits
WHERE expense_id = v_expense_id
  AND (
    (p_paid_by_user_id IS NOT NULL AND user_id = p_paid_by_user_id)
    OR (p_paid_by_user_id IS NULL AND user_id IS NULL AND member_name = p_paid_by_name)
  );
```

In `edit_expense`, apply the identical fix to its safety-net DELETE (replacing `v_old_expense.paid_by_user_id` with the same pattern, using `v_old_expense.paid_by_name` for the name match).

One migration, both RPCs updated.

---

## Fix 2 — nonPayerSplits excludes all placeholders when payer is placeholder (CRITICAL)

**File: `ExpenseDetailSheet.tsx` lines 99 and 116**

Replace both `.filter((s) => s.user_id !== expense?.paid_by_user_id)` with:

```typescript
.filter((s) => {
  if (expense?.paid_by_user_id) return s.user_id !== expense.paid_by_user_id;
  return s.member_name !== expense?.paid_by_name;
})
```

---

## Fix 3 — Wrong avatar for placeholder payer (HIGH)

**File: `ExpenseDetailSheet.tsx` lines 134-136**  
  
Replace the payerMember lookup:

```typescript
const payerMember = expense?.paid_by_user_id
  ? groupMembers.find((m) => m.user_id === expense.paid_by_user_id && m.status === "active")
  : groupMembers.find((m) => m.name === expense?.paid_by_name && m.is_placeholder && m.status === "active")
  ?? null;
```

  
In Fix 3, use case-insensitive name matching for the placeholder payer lookup — compare `m.name.toLowerCase() === expense.paid_by_name?.toLowerCase()` instead of strict equality. This guards against inconsistent casing between group_members.name and expenses.paid_by_name.

---

## Fix 4 — Edit button visible when partially settled (MEDIUM)

**File: `ExpenseDetailSheet.tsx**`

Derive a new boolean near the other computed values:

```typescript
const expensePartiallySettled = !expenseFullySettled && nonPayerSplits.some((s) => s.is_settled);
```

Change the edit button condition at line 354 from:

```
isCreator && !expenseFullySettled
```

to:

```
isCreator && !expenseFullySettled && !expensePartiallySettled
```

---

## Fix 5 — fetchExpenseSplits fails silently (MEDIUM)

**File: `AppContext.tsx` line 283-285**

Add a user-facing toast in the catch block:

```typescript
catch (err) {
  if (import.meta.env.DEV) console.error("Failed to fetch expense splits", err);
  toast({ title: "Couldn't load expense details. Pull to refresh.", variant: "destructive" });
}
```

---

## Fix 6 — Splits realtime subscription has no group filter (MEDIUM)

`expense_splits` has no `group_id` column, so a server-side filter on `group_id` is not possible without a schema change. Adding a `group_id` column to expense_splits is a non-trivial schema change that risks breaking existing data flows.

**Decision: Document and skip.** Add a comment to the subscription explaining the limitation. No code change beyond the comment. This is a known post-launch optimization.

---

## Implementation Order

1. DB migration (Fix 1 RPCs) — one migration, both `create_expense_with_splits` and `edit_expense`
2. `ExpenseScreen.tsx` line 481 (Fix 1 client)
3. `ExpenseDetailSheet.tsx` lines 99, 116 (Fix 2), lines 134-136 (Fix 3), edit button (Fix 4)
4. `AppContext.tsx` catch block (Fix 5), comment on subscription (Fix 6)

## Files touched

- `ExpenseScreen.tsx` — 1 line change
- `ExpenseDetailSheet.tsx` — 5 locations changed
- `AppContext.tsx` — 2 locations changed
- DB migration — 2 RPCs updated