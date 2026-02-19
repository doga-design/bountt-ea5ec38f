

# Phase 2A: Dashboard Onboarding — Implementation Plan

## Screenshot Analysis

### Screen 1 — Empty State (no members yet)
- **Orange header** (~40% of viewport): group emoji avatar (white circle with smiley), member avatars row (single smiley + "+" button), settings gear icon (top-right), group name "Condo Squad" in bold white
- **Grey body**: bold black heading "Who've you been splitting costs with?", grey subtitle "Type your friend's name to get started!", white rounded input card with placeholder "e.g. Kyle, Sarah..." and a grey circle arrow button (disabled state)
- When text is typed (screenshot 2): input card gets an orange border, arrow button turns orange (enabled)

### Screen 2 — Member Added (after confetti)
- Header now shows 2 member avatars (smiley + blue person) plus "+" button
- Body: bold heading "Cool, you added **Kyle**! Let's bring your group to life." (Kyle in orange)
- Grey subtitle: "What's the last thing you and **Kyle** paid for together?" (Kyle in orange)
- Large orange gradient pill button: "Add a quick **shared expense** +" ("shared expense" in bold white)

### Screen 3 — Expense Bottom Sheet
- Background dimmed, dashboard visible behind
- Bottom sheet with drag handle, rounded top corners
- Title: "What did you pay for?" in bold
- Subtitle: "Splitting equally with **kyle**" (kyle in orange, lowercase)
- Large centered amount display: "$13" (dollar sign in grey, number in bold black)
- 4x3 grid of grey rounded rectangles (numpad buttons — numbers not visible in screenshot but implied)
- Orange "Continue" button with arrow at bottom

### Screen 4 — Alive Dashboard (after expense logged)
- Header: same 2 member avatars + "+", group name, **balance pill** on right: "$10 owed" in white on grey pill with stack icon
- Settings gear top-right
- Body: single expense card (white, rounded)
  - Left: package icon + "Quick Expense" bold + "Paid by **You**" below
  - Right: "$10" in grey pill + "**Kyle**'s share is $5" below
- Bottom navigation bar: Home icon + "Home" label (left), orange FAB circle with "+" (center), stack icon + "All Groups" label (right)

## State Machine

```text
Dashboard loads -> check groupMembers.length and expenses.length

if members <= 1 (just creator) AND expenses === 0:
  -> Show STEP 1: Add Member

if members > 1 AND expenses === 0:
  -> Show STEP 2: Prompt Expense

if members > 1 AND expenses > 0:
  -> Show NORMAL DASHBOARD
```

On return visits: if user added Kyle but no expenses, show Step 2. If they have expenses, show normal dashboard.

## Files to Create

### 1. `src/components/dashboard/DashboardHeader.tsx`
Orange header section containing:
- Member avatars row (circular, overlapping) with "+" add button
- Group name (bold white)
- Group emoji in white circle
- Settings gear icon (top-right)
- Balance pill (conditionally shown when expenses exist)

### 2. `src/components/dashboard/EmptyState.tsx`
Step 1: "Who've you been splitting costs with?"
- Heading, subtitle, input card with arrow submit button
- Input gets orange border on focus/when has text
- Arrow button grey when empty, orange when has text
- On submit: calls `addPlaceholderMember`, triggers confetti, transitions to Step 2

### 3. `src/components/dashboard/AddExpensePrompt.tsx`
Step 2: "Cool, you added [Name]!"
- Dynamic heading with member name in orange
- Subtitle with member name in orange
- Large orange gradient pill button "Add a quick shared expense +"
- On tap: opens expense bottom sheet

### 4. `src/components/dashboard/ExpenseSheet.tsx`
Bottom sheet (using Vaul drawer):
- "What did you pay for?" title
- "Splitting equally with [name]" subtitle
- Large amount display ($XX)
- Numpad grid (1-9, ., 0, backspace)
- "Continue" orange button at bottom
- On submit: calls `addExpense` + inserts splits, triggers big confetti

### 5. `src/components/dashboard/ExpenseCard.tsx`
Single expense display card:
- Package icon + description (bold) on left
- Amount in grey pill on right
- "Paid by [Name]" below left
- "[Name]'s share is $X" below right

### 6. `src/components/dashboard/BalancePill.tsx`
Header balance indicator:
- "$X owed" text with stack icon
- Grey/white pill background
- Only shown when expenses exist

### 7. `src/components/BottomNav.tsx`
Sticky bottom navigation:
- Home icon + "Home" label (left)
- Orange FAB circle with "+" (center, elevated)
- Stack icon + "All Groups" label (right)
- Only shown in normal dashboard mode (not during onboarding)

### 8. Modified: `src/pages/Dashboard.tsx`
Main orchestrator:
- Sets current group from URL param
- Determines onboarding step vs normal mode
- Renders DashboardHeader + appropriate body content
- Renders BottomNav when in normal mode

### 9. Modified: `src/contexts/AppContext.tsx`
- Extend `addExpense` to also insert `expense_splits` rows (equal split among all members)
- Add `expenseSplits` state array + `fetchExpenseSplits`
- Add proper balance calculation using splits

### 10. Modified: `src/types/index.ts`
- Add `addExpenseWithSplits` to `AppContextValue`
- Add `expenseSplits` and `expenseSplitsLoading` to `AppState`

## Technical Details

### Expense + Splits Insert Logic
When user submits an expense from the onboarding sheet:
1. Insert into `expenses`: amount, description="Quick Expense", paid_by_user_id=current user, paid_by_name="You", group_id, created_by
2. Insert into `expense_splits`: one row per member, share_amount = amount / memberCount
3. Both inserts happen in sequence (expense first to get ID, then splits)

### Balance Calculation (Corrected)
For the current user's net balance:
- Sum all amounts where they paid (unsettled) = totalPaid
- Sum all their split shares (unsettled) = totalOwed
- netBalance = totalPaid - totalOwed
- Positive means others owe you, negative means you owe others
- Display: "$X owed" (positive) or "$X owing" (negative)

### Confetti
- Install `canvas-confetti` package
- Small confetti: `confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 }, colors: ['#E8480A', '#FFFFFF'] })`
- Big confetti: `confetti({ particleCount: 120, spread: 100, origin: { y: 0.5 }, colors: ['#E8480A', '#FFFFFF', '#D4D4D4'] })`

### Numpad Component
Custom numpad grid (not native keyboard):
- 4 rows x 3 columns: [1,2,3], [4,5,6], [7,8,9], [.,0, backspace-icon]
- Tapping numbers builds the amount string
- Dollar sign prefix always shown
- Max amount: $999,999.99
- Max 2 decimal places

## Estimated Timeline
- Phase 2A total: 3-4 days
  - Day 1: DashboardHeader, EmptyState (Step 1), confetti
  - Day 2: AddExpensePrompt (Step 2), ExpenseSheet with numpad
  - Day 3: ExpenseCard, BalancePill, BottomNav, state machine logic
  - Day 4: AppContext extensions (splits insert, balance calc), testing + polish

## Dependencies
- `canvas-confetti` npm package (new)
- `vaul` (already installed) for bottom sheet

## Done Criteria
1. User lands on empty dashboard after onboarding invite screen
2. Sees "Who've you been splitting costs with?" with input
3. Types "Kyle", arrow turns orange, taps submit
4. Small confetti plays, prompt updates to "Cool, you added Kyle!"
5. Taps "Add a quick shared expense +"
6. Bottom sheet opens with numpad, enters amount
7. Taps "Continue", big confetti plays
8. Dashboard shows expense card, balance pill "$X owed", bottom nav appears
9. On refresh/return: shows normal dashboard (not onboarding again)
10. Expense + splits saved correctly in database

