# Redesign Expense Feed Items

## Current State

- `ExpenseCard.tsx` is the only expense row component, used in `Dashboard.tsx` (unsettled groups + settled section)
- It uses a card-based design with left border accent, text-only layout, no avatars
- Data: `Expense`, `ExpenseSplit[]`, `GroupMember[]`, `onClick`

## New Component: `src/components/dashboard/ExpenseFeedItem.tsx`

Single component handling all states. Same props interface as current `ExpenseCard`.

### Layout (matching reference)

```text
┌──────────────────────────────────────────────────┐
│  ┌────┐  Name, paid $X          Label            │
│  │ AV │  Expense Name        ○○ $share/$total    │
│  └────┘                                          │
├──────────────────────────────────────────────────┤
```

- **Left**: 56px circular avatar (payer color bg, getAvatarImage PNG). Payer name + "paid $X" on line 1 (medium weight). Expense description on line 2 (font-extrabold, larger, single-line truncate ~30ch).
- **Right**: Small muted label on top. Below: small stacked avatars (28px, max 2 + "+N") of involved non-payer members, then bold amount `$share` + muted `/$total`.
- **Divider**: thin `border-b` between rows, no card/shadow/border-l.

### Amount Formatting

New helper: drop `.00` on round numbers (`$8` not `$8.00`), keep decimals otherwise (`$28.66`), comma thousands. Font scales down at 5+ digits.

### State Derivation Logic (all internal)

Given `expense`, `splits`, `groupMembers`, `currentUserId`:

1. **isPayer** = `expense.paid_by_user_id === currentUserId`
2. **mySplit** = split where `user_id === currentUserId`
3. **isInvolved** = isPayer or mySplit exists
4. **isCover** = payer not in splits (paid for someone else, not splitting with self)
5. **nonPayerSplits** = splits excluding payer's own split
6. **unsettledNonPayerSplits** = nonPayerSplits where `!is_settled`
7. **allSettled** = expense.is_settled or all nonPayerSplits settled
8. **totalOwedToMe** (if isPayer) = sum of unsettled nonPayerSplits
9. **myRemaining** (if !isPayer) = mySplit?.is_settled ? 0 : mySplit?.share_amount

**Label + amount derivation:**


| Scenario                                | Label             | Amount shown             | Right avatars          |
| --------------------------------------- | ----------------- | ------------------------ | ---------------------- |
| Someone paid, I owe (unsettled)         | "You pay [Name]"  | $myShare / $total        | payer avatar           |
| Someone paid, I owe (my split settled)  | "You're square"   | $0 / $total              | muted                  |
| Someone paid, not involved              | "Not involved"    | $0.00 / $perPerson       | muted                  |
| Someone covered me (payer not in split) | "You pay [Name]"  | $fullAmount (no /total)  | payer avatar           |
| I paid, 1 person owes, unpaid           | "[Name] pays you" | $theirShare / $total     | their avatar           |
| I paid, 1 person owes, settled          | "All square"      | $0 / $total              | muted                  |
| I paid, multiple owe, some/all unpaid   | "They pay you"    | $totalRemaining / $total | stacked (max 2 + "+N") |
| I paid, multiple owe, all settled       | "All square"      | $0 / $total              | muted                  |
| I paid, covered someone (not in split)  | "[Name] pays you" | $fullAmount              | their avatar           |
| I paid, solo (1 split, only me)         | "Just you"        | $total                   | no avatar, muted       |
| Unknown/left payer                      | "[name], paid $X" | same logic               | ghost gray avatar      |


### Avatar Rendering

- Left: 56px circle, `getAvatarColor(payerMember)` bg, `getAvatarImage(payerMember)` inside (75% size). Unknown/left payer: `#9CA3AF` bg, no image.
- Right: 28px circles, stacked with `-ml-2` overlap (second avatar `z-10`). Max 2 visible + "+N" counter. Use member color + avatar image.
- Muted state: right side `opacity-40`.

### Style Rules

- No red/green anywhere. Amounts always dark or muted.
- Settled/not-involved: right side opacity reduced. Left always full.
- Row: `py-5 px-4`, no card, no shadow, no border-l. Divider via parent `divide-y`.
- Expense name: `font-extrabold text-base`, truncate with `max-w-[220px]` + ellipsis.
- Font family: inherits Sora/DM Sans from existing system.

## Files Changed

### 1. New: `src/components/dashboard/ExpenseFeedItem.tsx`

Full component as described. Imports `getAvatarImage`, `getAvatarColor` from avatar-utils, `useApp` for current user.

### 2. Modify: `src/pages/Dashboard.tsx`

- Replace `ExpenseCard` import with `ExpenseFeedItem`
- Replace both render sites (unsettled + settled)
- Change `space-y-3` wrapper to `divide-y divide-border` (dividers between rows, not spacing)
- Remove the card-specific class wrappers if any

### 3. Modify: `src/lib/bountt-utils.ts`

- Add `formatAmount(n: number): string` — drops `.00`, keeps decimals, comma thousands

### 4. Keep: `ExpenseCard.tsx` untouched (can be deleted later, but no references will remain)

### Not Touched

ExpenseScreen, numpad, AppContext, Supabase queries, routing, auth, settlement logic, ExpenseDetailSheet, any backend.