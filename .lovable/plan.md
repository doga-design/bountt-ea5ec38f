# Redesign Dashboard Expense Feed

## Overview

Rebuild the expense card list to match the new visual design: colored left accent bars, two-column layout with dynamic color logic, split indicators, and a collapsible "SETTLED" section at the bottom.

## Files Changed


| File                                       | Action                                                 |
| ------------------------------------------ | ------------------------------------------------------ |
| `src/components/dashboard/ExpenseCard.tsx` | Rewrite -- new layout and color logic                  |
| `src/pages/Dashboard.tsx`                  | Update -- new grouping logic with SETTLED section      |
| `src/lib/bountt-utils.ts`                  | Update -- uppercase date labels ("TODAY", "YESTERDAY") |


## Detailed Changes

### 1. Update `formatRelativeDate` in `bountt-utils.ts`

Change return values to uppercase: `"TODAY"`, `"YESTERDAY"`, `"LAST WEEK"`, `"2 WEEKS AGO"`, and uppercase month/day for older dates.

### 2. Rewrite `ExpenseCard` Component

**New props:**

```text
interface ExpenseCardProps {
  expense: Expense;
  splits: ExpenseSplit[];
  groupMembers: GroupMember[];  // NEW -- needed to look up payer's member ID for color
}
```

**Layout structure:**

```text
+--+-----------------------------------------------+
|  | Groceries                        $84           |
|  | Paid by You . Kyle owes $42.00   50 / 50       |
+--+-----------------------------------------------+
 ^
 4px colored left border (border-l-4)
```

- Use `border-l-4` with dynamic `style={{ borderColor }}` on the card container
- Remove the icon/Package element entirely
- Two-column flex: left = title + subtitle, right = amount + split indicator

**Color logic (accent bar and amount text):**

```text
if (expense.is_settled)        -> green (#10B981)
else if (isPayer)              -> orange (#E8480A)
else                           -> payer's avatar color via getAvatarColor(payerMemberId)
```

To find the payer's member ID: look up `groupMembers.find(m => m.user_id === expense.paid_by_user_id)` and use their `m.id` with `getAvatarColor()`.

**Subtitle logic ("Paid by X . Y owes $Z"):**

- Payer label: `"You"` (orange) if current user paid, otherwise `expense.paid_by_name` (colored with payer's avatar color). If settled, gray.
- Owes label (for 2-person splits): find the split belonging to the non-payer. If current user paid, show `"[other name] owes $[share]"`. If other paid, show `"You owe $[your share]"`.
- For 3+ person splits: find the largest non-payer split and show that person's name and share.
- For settled: show `"Settled"` with a checkmark instead of the owes text.
- Separator: `.` (middle dot character)

**Split indicator (below amount, right-aligned):**

- If settled: `"settled"` in green text
- If 2 splits: `"50 / 50"` in muted text
- If 3+ splits: `"[count]-way"` in muted text

**Settled card styling:**

- All text becomes muted/gray (title, subtitle, amount)
- Amount text color: gray instead of orange/black

### 3. Update Dashboard Grouping Logic

Currently groups expenses by date label only. New logic:

1. Separate expenses into two lists: `unsettled` and `settled`
2. Group `unsettled` by `formatRelativeDate(expense.date)` (returns "TODAY", "YESTERDAY", etc.)
3. Render unsettled groups first, then a "SETTLED" section at the bottom
4. The "SETTLED" section uses a collapsible wrapper (Radix Collapsible) -- starts collapsed
5. Pass `groupMembers` to each `ExpenseCard`

**Date header styling:**

- Uppercase text (handled by `formatRelativeDate` returning uppercase)
- `text-xs font-medium text-muted-foreground tracking-wider`
- Thin top border separator between sections (except first)

### 4. Edge Cases

- **Single-member expense (no other splits):** Show only "Paid by You", no owes text
- **3+ person split:** Show the largest non-payer split holder's name and share, plus "[count]-way" indicator (3+ people, it SHOULD show:
  - If you paid: "[Person] owes $[their share]" (pick one person, maybe largest or first)
  - If they paid: "You owe $[your share]")
- **Settled expenses:** Gray text, green accent bar, "Settled" with checkmark, in SETTLED section
- **Placeholder members (no user_id):** Match by `member_name` and `is_placeholder` for color lookup; use member `id` for `getAvatarColor()`