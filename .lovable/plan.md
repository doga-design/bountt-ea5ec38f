

# Plan: 6 UI/UX Changes

## 1. Revert Hero Carousel to Previous State (minus labels)

The current HeroCarousel was rewritten as a static single-balance component. The user wants the **full carousel with slides restored** but with "x others pay you" / "x to settle" labels removed, and left-aligned text (not centered).

Since the original carousel files (NetBalanceSlide.tsx, AgingDebtSlide.tsx, ContributionSlide.tsx) were deleted and the full useHeroData.ts was gutted, these need to be **reconstructed** from scratch based on the architecture described in project history and memory context.

**Files:**
- `src/components/dashboard/HeroCarousel.tsx` — Restore embla-carousel, multiple slides, dots, swipe. Keep nav bar (group icon + name + settings). Left-align hero content (not centered). Remove any "X others pay you" / "X to settle" text labels from slides.
- `src/components/dashboard/slides/useHeroData.ts` — Restore full debt calculation logic (debtsYouOwe, agingDebts, per-member breakdowns) needed for slides. Keep netBalance.
- `src/components/dashboard/slides/NetBalanceSlide.tsx` — Recreate: shows net balance with "you're up"/"you owe"/"all settled" label. Remove any "X others pay you" / "X to settle" breakdown text. Left-aligned.
- `src/components/dashboard/slides/AgingDebtSlide.tsx` — Recreate: shows aging debt info without the summary labels.
- `src/components/dashboard/slides/ContributionSlide.tsx` — Recreate: shows contribution stats.

**Note:** Since the original code is no longer available, these will be rebuilt to match the described architecture. The critical constraint is: **no "X others pay you" or "X to settle" labels**, left-aligned text, carousel with dots and swipe.

---

## 2. Reverse Particle Direction in ExpenseSpokeViz

The animated dots currently travel from payer (top) to members (bottom). Reverse so they travel from members (bottom) to payer (top), indicating money flowing from splitters to payer.

**Files:**
- `src/components/dashboard/ExpenseSpokeViz.tsx` — Reverse the `animateMotion` path direction. Currently path goes `M payer Q ctrl member`. Change to `M member Q ctrl payer` for the animation only (keep the visual path the same).
- `src/components/expense/MemberAvatarGrid.tsx` — Same reversal: path currently goes from apex (top) to member (bottom). Reverse the `animateMotion` path.

**Technical:** For both files, reverse the `d` string used in `<animateMotion path="...">` while keeping the `<path d="...">` the same (so the dashed line stays, but dots move bottom→top).

---

## 3. GroupName CTA Turns Orange When Input Has Text

Currently the bottom CTA button uses `bg-muted text-foreground`. When `name.trim()` is non-empty, switch to `bg-primary text-primary-foreground`.

**File:** `src/pages/onboarding/GroupName.tsx` line 182
- Change class from static `bg-muted text-foreground` to conditional: `name.trim() ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"`

---

## 4. "You" Text Always Bold + User's Avatar Color

Everywhere "You" appears as a label for the current user, render it in **bold** and in the **user's assigned avatar color** (from their group member record's `avatar_color`).

**Affected files and locations:**
- `ExpenseFeedItem.tsx` line 103/240 — payerName "You"
- `ExpenseCard.tsx` line 45 — "You" in "Paid by You"
- `ExpenseSpokeViz.tsx` line 206/225 — "You" in payer/member labels
- `MemberAvatarGrid.tsx` line 161 — "You" label under avatar
- `MemberCard.tsx` line 53 — "You" in member card
- `MemberAvatarRow.tsx` line 140 — "You" label
- `ExpenseDetailSheet.tsx` lines 96, 102, 476, 504 — "You" in subtitle, activity log
- `ExpenseSheet.tsx` line 165 — "You" in member chips
- `CustomSplitRows.tsx` — "You" label in custom split rows
- `SplitSentence.tsx` — "You" in split sentence

**Approach:** In each location, find the current user's GroupMember record via `groupMembers.find(m => m.user_id === user?.id)`, get their color via `getAvatarColor(member).bg`, and apply `style={{ color, fontWeight: 'bold' }}` to the "You" text span.

---

## 5. BNTT- Prefix Permanently in Invite Code Input

In `src/pages/Join.tsx`, the invite code input should show a permanent grayed-out "BNTT-" prefix. The user only types the 4-character suffix.

**File:** `src/pages/Join.tsx`
- Replace the plain `<input>` with a flex container: a grayed-out `<span>BNTT-</span>` + an `<input>` that only accepts the 4-char suffix
- `code` state stores only the suffix (e.g., "ABCD")
- `maxLength={4}` on the input
- On submit, prepend "BNTT-" to form the full code: `"BNTT-" + code`
- Update validation: `code.length < 4` instead of `code.length < 9`
- Handle `paramCode`: if it starts with "BNTT-", strip the prefix for state
- Placeholder becomes "XXXX"

---

## 6. Default Everyone Selected on Slide 2

In `src/components/expense/ExpenseScreen.tsx`, when the expense drawer opens in **create mode**, all grid members should be selected by default instead of none.

**File:** `src/components/expense/ExpenseScreen.tsx` line 153-154
- Change from `setActiveIds(new Set())` to `setActiveIds(new Set(members.filter(m => m.id !== selfMember?.id).map(m => m.id)))` — select all non-payer members by default
- This means the user deselects people they want to exclude, rather than selecting who to include

---

## Bonus: Clean Up Remaining ✓ Emojis

Three files still have `✓` characters that should have been removed:
- `MemberCard.tsx` line 18: `"All settled ✓"` → `"All settled"`
- `ExpenseDetailSheet.tsx` lines 221, 240: `"Share settled ✓"` → `"Share settled"`
- `MemberDetailSheet.tsx` line 164: `"✓"` → use a Lucide `Check` icon or just remove

---

## Files Summary

| File | Changes |
|------|---------|
| `HeroCarousel.tsx` | Restore carousel, remove labels, left-align |
| `slides/useHeroData.ts` | Restore full data hook |
| `slides/NetBalanceSlide.tsx` | Recreate |
| `slides/AgingDebtSlide.tsx` | Recreate |
| `slides/ContributionSlide.tsx` | Recreate |
| `ExpenseSpokeViz.tsx` | Reverse particle direction |
| `MemberAvatarGrid.tsx` | Reverse particle direction |
| `GroupName.tsx` | Orange CTA on input |
| `Join.tsx` | BNTT- prefix |
| `ExpenseScreen.tsx` | Default all selected |
| Multiple files | Bold + colored "You" text |
| `MemberCard.tsx`, `ExpenseDetailSheet.tsx`, `MemberDetailSheet.tsx` | Remove remaining ✓ |

