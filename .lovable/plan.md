# Plan: Five Targeted Fixes

## Fix 1 — Modals/Drawers Always Above Navbar

**Current state**: BottomNav = `z-[9999]`. All modals/sheets/drawers use `z-50` (= 50). ExpenseScreen custom drawer = `z-50` (line 590). The navbar is ABOVE all drawers.

**Fix**: Lower navbar: BottomNav = `z-[49]` so it sits above everything else but the modals drawers toasts etc...

## Fix 2 — Current User First in Filter Row

**Current state**: `MemberAvatarRow.tsx` — sorts members with current user first already (line 23-30). The `currentUserMember` is found on line 32. The user IS included — `sorted` contains all active members.

Wait — re-reading the user's request: "Currently they are missing from this row entirely." Let me verify: `sorted` is built from `activeMembers` which is `members.filter(m => m.status === 'active')`. The current user should be in `members` (passed from Dashboard as `groupMembers`). If they're missing, it's the second-group bug (fetchMembers not called). But the user says to add them explicitly.

**Fix**: In `MemberAvatarRow.tsx`, the current user IS already included and sorted first. The label already shows "You" for `isMe`. The request says they're "missing" — this is likely the second-group bug where `groupMembers` doesn't include the creator. That's a separate AppContext bug. For this fix, just confirm the component handles the current user correctly and add a defensive check — no structural change needed. The component is already correct.

Actually, re-reading more carefully: the user wants the avatar filter row to show the current user as first, labeled "You". Looking at the code — this IS already implemented (lines 22-30, 88, 140-142). The user may be experiencing the second-group bug. No change needed for Fix 2's "always first" part — it's already there.  
  
**NOTE: NO** the user avatar is not showing in the UI / in the avatar row. I can only see the other members not the user. ensure the user avatar is also included or find whats causing them to not display if the code exists for it. **Find the minimal fix for this.**

## Fix 3 — Tap Avatar to Filter Feed

**Current state**: `MemberAvatarRow` has `selectedMemberId` state and a TODO comment on line 39: `// TODO: filter feed by selected member`. Selection state exists but doesn't propagate to Dashboard.

**Fix**: 

- Add `onFilterMember?: (memberId: string | null) => void` prop to `MemberAvatarRow`
- When a non-placeholder member is tapped: if already selected, call `onFilterMember(null)` (deselect). If not selected, call `onFilterMember(memberId)`.
- Use stroke color from `getAvatarColor(member).stroke` for selected border instead of hardcoded `#D94F00`
- In `Dashboard.tsx`: add `filterMemberId` state, pass `onFilterMember` to `MemberAvatarRow`, filter `unsettledGroups` and `settledExpenses` by whether the expense involves that member (as payer via `paid_by_user_id` or `paid_by_name`, or as split participant via `expenseSplits`)

**Files**:

- `MemberAvatarRow.tsx` — add prop, call it on tap, use stroke color for selected border
- `Dashboard.tsx` — add state, pass callback, apply client-side filter to expense lists

## Fix 4.1 — Payer Label Orange and Tappable

**Current state**: In `ExpenseScreen.tsx` line 630, the payer name in the headline uses `text-foreground` (black).

**Fix**: Change `text-foreground` to `text-primary` on the payer button (line 630). `text-primary` = brand orange from CSS tokens. Both slide 1 (line 630) and slide 2 (via SplitSentence) — check SplitSentence for payer rendering too.

**File**: `ExpenseScreen.tsx` line 630 — change class to `text-primary`

## Fix 4.2 — Name Input Restructure

**Slide 1**: Move the description input from its current position (line 652-661) to directly below the payer headline (after line 636). Add `mt-2.5 mb-2.5` margins. Remove the duplicate at line 652-661.

**Slide 2**: Replace the description `<input>` (lines 820-829) with a static label showing the cost name above the amount display. Layout: cost name label → amount number. Remove the editable input.

**Files**: `ExpenseScreen.tsx`

## Fix 4.3 — Total Number Uses BringBoldNineties

**Current state**: `AmountDisplay.tsx` line 83 uses `font-sora font-extrabold` for the amount number.

**Fix**: Change to `font-bringbold` on line 83. This applies to both slide 1 and slide 2 amount displays since both use `AmountDisplay`. Wait — the user says "only to the numpad total number" not everywhere. Both slides use AmountDisplay. The user wants it on the numpad total specifically. Since both slides are in the numpad/expense entry context, applying font-bringbold to AmountDisplay is correct — it's only used inside ExpenseScreen.

Actually, let me check if AmountDisplay is used elsewhere... searching... it's only imported in ExpenseScreen. So changing it is safe.

**File**: `AmountDisplay.tsx` line 83 — change `font-sora font-extrabold` to `font-bringbold`

---

## Files Changed Summary


| File                                           | Change                                                                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/ui/drawer.tsx`                 | z-50 → z-[10000] on overlay + content                                                                                                 |
| `src/components/ui/sheet.tsx`                  | z-50 → z-[10000] on overlay + content                                                                                                 |
| `src/components/ui/dialog.tsx`                 | z-50 → z-[10000] on overlay + content                                                                                                 |
| `src/components/ui/toast.tsx`                  | z-[100] → z-[10001]                                                                                                                   |
| `src/components/expense/ExpenseScreen.tsx`     | z-50 → z-[10000]; payer label orange; move description input to under headline on slide 1; replace input with static label on slide 2 |
| `src/components/expense/AmountDisplay.tsx`     | font-sora → font-bringbold on amount number                                                                                           |
| `src/components/dashboard/MemberAvatarRow.tsx` | Add onFilterMember prop; use stroke color for selected border                                                                         |
| `src/pages/Dashboard.tsx`                      | Add filterMemberId state; filter expenses client-side; pass callback to MemberAvatarRow                                               |


## Files NOT Changed

AppContext, RPCs, RLS policies, auth, settlement logic, realtime subscriptions, avatar-utils.