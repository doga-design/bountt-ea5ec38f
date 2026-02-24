

# Hero Carousel Implementation Plan

## Overview

Replace the current `DashboardHeader` with a swipeable hero carousel containing up to 3 conditional slides. The carousel uses the already-installed `embla-carousel-react` library and the existing `Carousel` UI component.

## Files Changed

| File | Action |
|------|--------|
| `src/components/dashboard/HeroCarousel.tsx` | **Create** -- main carousel wrapper with shared nav bar and dot indicators |
| `src/components/dashboard/slides/NetBalanceSlide.tsx` | **Create** -- Slide 1: always-present net balance |
| `src/components/dashboard/slides/AgingDebtSlide.tsx` | **Create** -- Slide 2: conditional aging debt alert (14+ days) |
| `src/components/dashboard/slides/ContributionSlide.tsx` | **Create** -- Slide 3: conditional contribution insight (5+ expenses) |
| `src/components/dashboard/slides/useHeroData.ts` | **Create** -- shared hook that computes all slide data from AppContext |
| `src/pages/Dashboard.tsx` | **Update** -- replace `<DashboardHeader>` with `<HeroCarousel>` in "normal" mode |

No database changes required. All data (expenses, splits, members) is already available via AppContext.

---

## Data Layer: `useHeroData` Hook

A single custom hook that computes everything the three slides need:

**Net Balance (Slide 1):**
- `totalOwedToYou`: For each unsettled expense YOU paid, sum all OTHER members' split amounts
- `totalYouOwe`: For each unsettled expense OTHERS paid, sum YOUR split amount
- `netBalance`: totalOwedToYou - totalYouOwe
- `debtsYouOwe`: Array of `{ payerName, payerMember, expenseName, amount, expenseId }` -- individual debts the current user owes to others (for the action row)

**Aging Debts (Slide 2):**
- Filter all unsettled expenses where `daysSince(expense.created_at) >= 14`
- For each, determine if user owes or is owed
- Sort oldest first
- Result: `agingDebts` array of `{ daysWaiting, personName, amount, expenseName, direction: "you_owe" | "owed_to_you", expenseId }`

**Contribution (Slide 3):**
- `totalGroupExpenses`: sum of all expense amounts (settled + unsettled)
- `totalUserPaid`: sum of expenses where `paid_by_user_id === currentUser.id`
- `contributionPct`: `(totalUserPaid / totalGroupExpenses) * 100`
- Only computed if `expenses.length >= 5`

**Slide visibility:**
- Slide 1: always
- Slide 2: if `agingDebts.length > 0`
- Slide 3: if `expenses.length >= 5`
- `slideCount`: total visible slides (1-3)

---

## Component Architecture

### `HeroCarousel`

Uses the existing `embla-carousel-react` directly (not the shadcn Carousel wrapper, which adds padding/margins we don't want). Structure:

```text
+----------------------------------------------+
| [emoji] Group Name                    [gear]  |  <-- fixed nav bar (10% darker tint overlay)
+----------------------------------------------+
|                                              |
|   [Slide content - swipeable area]           |  <-- embla viewport
|                                              |
+----------------------------------------------+
|              . . ---                         |  <-- dot indicators (only if slideCount > 1)
+----------------------------------------------+
```

- Full orange background (#E8480A) with rounded-2xl bottom corners
- Nav row is positioned absolutely or sits above the carousel viewport
- Dots are positioned at the bottom, inside the orange container
- Active dot is a wider pill shape (white), inactive dots are small circles (white/50%)

### Slide 1: NetBalanceSlide

**Layout:**
- Status badge: rounded pill with white/20% bg, white text ("You're up" / "You're even" / "You're behind")
- Large balance number: very large bold white text with +/- prefix. The "+" sign rendered in white/40% opacity
- Two breakdown lines below: "$X owed to you" and "$Y you owe" in white/60% text, dollar amounts in white bold
- Conditional action row (only if `debtsYouOwe.length > 0`):
  - Separated by a horizontal line (white/20%)
  - Left side: "[Name] . [Expense Name]" bold white, "$X.XX to settle" white/60%
  - Right side: "Pay [Name]" white filled button (orange text), "Not yet" outline button (white border/text)
  - "Not yet" cycles through `debtsYouOwe` array; when all cycled, action row disappears (local state index)

### Slide 2: AgingDebtSlide

**Layout:**
- Giant number (days waiting) in white, bold, very large
- Refresh/cycle button (circular, white/20% bg, white icon) next to the number -- only if multiple aging debts exist
- "days waiting" label below number in white/60%
- Context line: "You owe [Name] $[amount] from [Expense Name]" or "[Name] still owes you $[amount] from [Expense Name]" -- bold names, white text
- Two buttons:
  - If user owes: "Pay [Name]" (white filled, orange text) + "Remind me later" (outline, white)
  - If user is owed: "Settle it" (white filled, orange text) + "Remind me later" (outline, white)
- "Go to expense >" underlined link (white/60%) -- only in the "you owe" variant

### Slide 3: ContributionSlide

**Layout:**
- Large bold italic-style heading:
  - ">60%": "You've been picking up the tab lately."
  - "40-60%": "You're splitting evenly."
  - "<40%": "Others have been covering more."
- Supporting stat: "You covered $X of $Y total expenses" -- "You" and dollar amounts bold white, rest white/60%
- "See breakdown" underlined link in white/60%

---

## Button Actions

- **"Pay [Name]"**: Triggers the existing settlement flow (mark expense as settled via Supabase update on the `expenses` table, setting `is_settled = true`)
- **"Settle it"**: Same settlement flow but for expenses owed to you
- **"Not yet"**: Local state increment to cycle to next debt in the array
- **"Remind me later"**: Dismisses slide 2 for this session (local state boolean, resets on page reload)
- **"See breakdown"**: Scrolls to or opens the MemberCardScroll section (or no-op placeholder for now)
- **"Go to expense >"**: No-op placeholder for now (future: opens expense detail)

---

## Dashboard.tsx Changes

In the "normal" mode rendering:

- Remove `<DashboardHeader onAddMember={undefined} showBalance={mode === "normal"} />`
- Replace with `<HeroCarousel />`
- Keep `<DashboardHeader>` for "empty" and "prompt" modes (or simplify to just the nav bar there too)

---

## Styling Details

- Orange background: `#E8480A` (matches existing `primary` / Bountt orange)
- Slightly darker tint for nav bar area: a `bg-black/10` overlay div behind the nav row
- Card has `rounded-2xl` on all corners
- Dot indicators: active = `w-6 h-2 rounded-full bg-white`, inactive = `w-2 h-2 rounded-full bg-white/50`
- All text is white, with secondary text at `white/60%` opacity
- Buttons: "Pay" = `bg-white text-[#E8480A] font-bold rounded-full px-6 py-3`, outline = `border border-white/60 text-white font-bold rounded-full px-6 py-3`
- Large numbers use `text-6xl` or `text-7xl font-extrabold`
- The "+" prefix on Slide 1 uses `text-white/40`

## Edge Cases

- **No debts owed**: Slide 1 shows balance + breakdown only, no action row
- **No old debts**: Slide 2 does not render, fewer dots
- **Fewer than 5 expenses**: Slide 3 does not render
- **All settled / net = 0**: Badge shows "You're even", amounts show $0, no action row
- **Single slide only**: No dot indicators displayed
- **Single-member group**: Net always $0, contribution always 100%

