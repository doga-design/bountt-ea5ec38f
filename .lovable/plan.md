# Hero Action Row: Anti-Nagging Fixes

## What Changes

Three filtering rules for the debt action chips in the Net Balance slide:

1. **7-day age gate** -- Only show debts from expenses older than 7 days
2. **Cooldown after 4 dismissals** -- After the user taps "Not yet" through ~4 debts, hide the chip for 24 hours (persisted in localStorage)
3. **Amount cap at $30, smallest first** -- Only show debts <= $30, sorted smallest first
4. **BTN & cta change;** When the user is owed by other users display the "settle up" button, when user ows money to other users show "pay now" (these buttons will serve different purposes in the future of this product) AND the context-microcopy should switch accordingly under as well (e.g"$X owed to [user]" or "[user] owes $X to you" etc...)

## Understanding for 2 action types (owe and owed):

**The filtering works for BOTH directions:**

```
Get all debts (you owe + owed to you)
Filter:
  - 7+ days old
  - ≤$30
  - Sort smallest first
  
For each debt:
  if (you owe):
    show "Pay Now"
  else (owed to you):
    show "Settle Up"
```

**Both buttons mark expense as settled**, just different:

- "Pay Now" = I'm paying this (future: opens paypal/e-transfer deeplink)
- "Settle Up" = I'm forgiving this/we settled offline

## File Changes

### 1. `src/components/dashboard/slides/useHeroData.ts`

- Add `createdAt: string` to the `DebtItem` interface (needed for the 7-day filter)
- When building `debtsYouOwe`, include `createdAt: expense.created_at`
- Filter debts: only include items where `daysSince(expense.created_at) >= 7` AND `amount <= 30`
- Sort `debtsYouOwe` by amount ascending (always the smallest first)

### 2. `src/components/dashboard/slides/NetBalanceSlide.tsx`

- Add `MAX_DISMISSALS = 4` and `COOLDOWN_MS = 24 * 60 * 60 * 1000` constants
- On mount, read `hero_cooldown_until` from localStorage; if it's in the future, start with `dismissed = true`
- In `handleNotYet`, track a running dismiss count; when it reaches `MAX_DISMISSALS`, set `dismissed = true` and write `hero_cooldown_until = Date.now() + COOLDOWN_MS` to localStorage
- Add `currentGroup.id` as part of the localStorage key so cooldowns are per-group

### 3. `src/components/dashboard/HeroCarousel.tsx`

- Pass `currentGroup.id` as a new prop to `NetBalanceSlide` (needed for the per-group cooldown key)

## Technical Detail

**localStorage key format:** `bountt_hero_cooldown_{groupId}`
**Value:** ISO timestamp string of when cooldown expires

The cooldown resets naturally after 24 hours. If new qualifying debts appear (e.g., a debt ages past 7 days), they'll show after the cooldown expires.

The $30 cap is defined as a constant `MAX_CHIP_AMOUNT = 30` in `useHeroData.ts` for easy adjustment later.