

# Two Changes: Replace Emojis with SVG Icons + Simplify Hero

## CHANGE 1 — Replace All Emojis with SVG Icons

### Step 1: Copy SVG files to project
Copy 10 uploaded SVGs to `src/assets/icons/`:
- `icon-01.svg` (burger), `icon-02.svg` (car), `icon-03.svg` (friends), `icon-04.svg` (hearts), `icon-05.svg` (home), `icon-06.svg` (palmtree), `icon-07.svg` (party), `icon-08.svg` (plane), `icon-09.svg` (tent), `icon-10.svg` (ticket)

### Step 2: Create icon utility
New file `src/lib/group-icon-utils.ts`:
- Map of icon IDs (`"icon-01"` through `"icon-10"`) to their imported SVG paths
- Helper `getGroupIcon(id: string): string` returns the SVG path
- Export `GROUP_ICON_IDS` array for the picker

### Step 3: Replace emoji picker in GroupName.tsx (onboarding)
- Replace `EMOJIS` array with `GROUP_ICON_IDS`
- Replace `SUGGESTIONS` emoji values with icon IDs (map each suggestion to a relevant icon)
- Replace emoji picker grid: render `<img>` tags for each icon instead of emoji text
- Replace emoji button in input row: render `<img>` of selected icon
- Default `emoji` state from `"🏅"` to `"icon-01"`
- Remove `"Name your group 🏅"` pill emoji — becomes `"Name your group"`
- Remove emojis from suggestion chip labels (`{s.label}` only, no emoji)
- `Continue →` arrow stays (→ is not an emoji, it's a text character)

### Step 4: Replace emoji rendering everywhere else
Files with `group.emoji` rendering:
- **Groups.tsx** line 86: `{group.emoji} {group.name}` → `<img>` + `{group.name}`
- **GroupBanner.tsx** line 44: `{group.emoji}` → `<img>` sized at ~48px
- **HeroCarousel.tsx** line 87: `{currentGroup.emoji}` → `<img>` sized at ~24px
- **DashboardHeader.tsx** line 106-107: emoji overlapping circle → `<img>` inside the circle

### Step 5: Remove all other emojis
| File | Line | Emoji | Action |
|------|------|-------|--------|
| ExpenseFeedItem.tsx | 179 | `"All square ✌️"` | → `"All square"` |
| Join.tsx | 113 | `"Welcome back 🎉"` | → `"Welcome back"` |
| Join.tsx | 207 | `"Welcome to the group 🎉"` | → `"Welcome to the group"` |
| Join.tsx | 236 | `"Merged with ${selected?.name}'s expenses 🎉"` | → `"Merged with ${selected?.name}'s expenses"` |
| Join.tsx | 263 | `"Join a group 🔓"` | → `"Join a group"` |
| Invite.tsx | 172 | `"Invite your friends to group 🔓"` | → `"Invite your friends"` |
| ComingSoon.tsx | 16 | `"Stay tuned! 🚀"` | → `"Stay tuned!"` |
| ExpenseSheet.tsx | 111 | `"First expense logged! 🎉"` | → `"First expense logged!"` |
| ExpenseSheet.tsx | 113 | `"Expense added ✓"` | → `"Expense added"` |
| ExpenseScreen.tsx | 568 | `"First expense logged! 🎉"` | → `"First expense logged!"` |
| ExpenseScreen.tsx | 570 | `"Expense added ✓"` | → `"Expense added"` |
| AmountDisplay.tsx | 41 | `"perfectly split ✓"` | → `"perfectly split"` |
| ExpenseScreen.tsx | 794 | `"perfectly split ✓"` | → `"perfectly split"` |
| NetBalanceSlide.tsx | 75 | `"Share settled ✓"` | → `"Share settled"` |

Note: `→` characters in button labels (e.g., `"Continue →"`, `"Join Group →"`, `"Remove $X →"`, `"Distribute $X →"`) and `→` in ActivityLog change detail text are arrow symbols, not emojis. They stay.

Note: `#22C55E` (green) in AmountDisplay.tsx and ExpenseScreen.tsx statusColor — this is a pre-existing style issue per the brand guide. Not changing logic in this PR, but the `✓` emoji removal addresses the text.

### Step 6: Verify zero emojis
Final search for all Unicode emoji ranges.

---

## CHANGE 2 — Simplify Hero to Single Balance Display

### Step 1: Files to delete entirely
- `src/components/dashboard/slides/AgingDebtSlide.tsx`
- `src/components/dashboard/slides/ContributionSlide.tsx`
- `src/components/dashboard/slides/NetBalanceSlide.tsx`

### Step 2: Simplify useHeroData.ts
Keep only what's needed for the single balance number:
- Keep: `netBalance` calculation (totalOwedToYou - totalYouOwe)
- Remove: `debtsYouOwe`, `agingDebts`, contribution stats, slide visibility flags
- Remove: `DebtItem`, `AgingDebt` interfaces
- Simplified `HeroData`: just `{ netBalance: number }`

### Step 3: Rewrite HeroCarousel.tsx → SimpleHero
Replace the entire carousel with a static component:
- Remove embla-carousel import (only used here; `carousel.tsx` UI component keeps its own import)
- Keep: gradient background, nav bar with group icon + name + settings gear
- Body: single centered section showing:
  - Small label: `"you're up"` (positive), `"you owe"` (negative), `"all settled"` (zero)
  - Large balance number: `$X` or `$X.XX` (no +/- prefix, no color coding)
  - No breakdown lines ("others pay you" / "to settle")
  - No action row, no debt cycling, no "Not yet" button
  - No dots, no swipe

### Step 4: Update Dashboard.tsx
- Import stays the same (HeroCarousel component, just simplified internally)
- No changes needed to Dashboard.tsx itself since it just renders `<HeroCarousel />`

### Step 5: Clean dead code
- Remove `DebtItem` and `AgingDebt` type exports from useHeroData
- Check if any other file imports from the deleted slide files — remove those imports
- `NetBalanceSlide` had PayPal/settlement logic — all removed with the file

### Files changed summary
| File | Action |
|------|--------|
| `src/assets/icons/icon-01.svg` through `icon-10.svg` | Create (copy from uploads) |
| `src/lib/group-icon-utils.ts` | Create |
| `src/pages/onboarding/GroupName.tsx` | Rewrite emoji picker → icon picker |
| `src/pages/Groups.tsx` | Replace emoji with `<img>` |
| `src/components/group-settings/GroupBanner.tsx` | Replace emoji with `<img>` |
| `src/components/dashboard/DashboardHeader.tsx` | Replace emoji with `<img>` |
| `src/components/dashboard/HeroCarousel.tsx` | Rewrite: remove carousel, single balance |
| `src/components/dashboard/slides/useHeroData.ts` | Simplify to netBalance only |
| `src/components/dashboard/slides/NetBalanceSlide.tsx` | Delete |
| `src/components/dashboard/slides/AgingDebtSlide.tsx` | Delete |
| `src/components/dashboard/slides/ContributionSlide.tsx` | Delete |
| `src/components/dashboard/ExpenseFeedItem.tsx` | Remove ✌️ |
| `src/pages/Join.tsx` | Remove 🎉, 🔓 |
| `src/pages/onboarding/Invite.tsx` | Remove 🔓 |
| `src/pages/ComingSoon.tsx` | Remove 🚀 |
| `src/components/dashboard/ExpenseSheet.tsx` | Remove 🎉, ✓ |
| `src/components/expense/ExpenseScreen.tsx` | Remove 🎉, ✓ |
| `src/components/expense/AmountDisplay.tsx` | Remove ✓ |

### Files NOT changed
AppContext, AuthGuard, Splash, Auth, types/index.ts (emoji field name stays), any RPC, any migration, any RLS policy, avatar system, BottomNav.

