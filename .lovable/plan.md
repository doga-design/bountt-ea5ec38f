Implementation plan (targeted to your 4 bug reports)

1. Fix auto-close reliability (root cause + approach)

- Root cause: the detail sheet currently receives a frozen `detailExpense` object from `Dashboard`, so `expense.is_settled` can go stale after settlement updates.
- Change in `Dashboard.tsx`:
  - Store `detailExpenseId` instead of full expense object.
  - Derive `detailExpense` from live `expenses` array (`find` by id) so settlement updates are reflected immediately.
- Change in `ExpenseDetailSheet.tsx`:
  - Keep auto-close effect, but trigger only on transition `false -> true` while open (not when opening an already-settled expense).
  - On transition: close sheet after 800ms.

2. Fix confetti timing and trigger conditions

- Remove incorrect confetti triggers:
  - Remove `onSettled?.()` calls from `handleSettleMyShare`, `handleSettleMemberShare`, and `handleSettleAll`.
- Replace with a strict “fully-settled-and-closed” pipeline:
  - `ExpenseDetailSheet` emits a dedicated callback only when it auto-closes because expense became fully settled.
  - `Dashboard` sets a `pendingConfetti` flag from that callback.
  - Fire confetti only when:
    - `pendingConfetti === true`
    - detail sheet is closed (`detailExpenseId === null`)
    - user is back on feed view (same dashboard route, no open detail drawer).
- Confetti style:
  - Use a large multi-burst/full-viewport pattern (several bursts + high spread) so it visibly covers most of screen.

3. Layout overhaul into 3 non-overlapping sections

- `ExpenseDetailSheet.tsx` structure refactor:
  - Drawer height fixed to `90dvh` (not max-only): `h-[90dvh] max-h-[90dvh]`.
  - Internal wrapper: `h-full flex flex-col justify-between min-h-0`.
- Top section (header):
  - Left column: title/subtitle/date copy, left-aligned.
  - Right column: action buttons.
  - Use `flex justify-between items-start`, remove absolute-positioned icons.
  - Add `min-w-0` + line clamp/wrap controls to prevent user/title overlap.
- Middle section:
  - Dedicated interactive area (payer at top, split members beneath, spoke visualization, popover, slider).
  - NO Slider (slider is only in the bottom section)
  - Keep settlement interactions in this section only.
  - Ensure responsive spacing at 390x824 and down to 320 width.
- Bottom section:
  - Activity log + Slider isolated at bottom with clear divider between them and own scroll handling if content is long.
  - Slider should be placed under activity log, activity log & slider should have a subtle divider line in between them.

4. Enforce 90% height + responsive section distribution

- Keep drawer always at 90% viewport height.
- Distribute top/middle/bottom via flex + `justify-between`; middle gets flexible space (`flex-1 min-h-0`) to prevent collisions.
- Add overflow boundaries so content never overlaps title/actions.

5. Validation checklist after implementation

- Settle all via slider: sheet auto-closes after settled transition.
- No confetti while sheet is open.
- Confetti **ONLY after drawer closes and feed is visible.**
- Header no longer overlaps at mobile width.
- Three sections remain clearly separated and stable across screen sizes.
- For the post-settlement animation sequence, enforce strict ordering using promises and state flags — no timeouts guessing when animations finish.  
  
The exact sequence must be:

1. Slide reaches right edge → lock slider, call `settle_all`
2. `settle_all` resolves → transition spoke viz to `ExpenseSettledState` (checkmark + "All settled up!")
3. User sees settled state briefly → then drawer begins closing
4. Drawer close animation completes fully → only then trigger confetti on the feed behind it
5. Confetti never fires while the drawer is open or mid-close

**How to implement this without confetti-timing bugs:**

- Use the vaul `Drawer` `onClose` callback — fire confetti inside `onClose`, not after a `setTimeout`
- Do not use `setTimeout` anywhere in this sequence — every step waits for the previous one to actually complete, not just a guessed delay
- Use a `ref` or state flag `celebratePending` — set it to true when settlement succeeds, read it in `onClose` to decide whether to trigger confetti
- Reset `celebratePending` to false inside `onClose` after confetti fires so it doesn't retrigger on unrelated closes

**For the header overlap fix:**

- Header row must use `flex` with `min-width: 0` on the title so long expense names truncate instead of pushing the icons off screen
- Icons must have `flex-shrink: 0` so they never compress

**For section stability:**

- Spoke viz and settled state must be the same fixed height — when one replaces the other the sheet doesn't reflow or jump
- Activity log section must have a fixed or min-height so adding new rows doesn't shift the sections above it