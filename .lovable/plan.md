

# Plan: Three Targeted Fixes

## Fix 1 — Avatar Filter Row: Filtering & Strokes

**Current code audit**: Reading `MemberAvatarRow.tsx` and `Dashboard.tsx` — the filtering logic and stroke logic appear correctly wired in the current source:
- `selectedMemberId` state toggles on tap (line 58-64)
- `onFilterMember` callback propagates to Dashboard's `setFilterMemberId` (line 192)
- Dashboard's `useMemo` (line 123-157) filters expenses by `filterMemberId`
- Stroke uses `isSelected = selectedMemberId === member.id` (line 92, 112)

**This code is correct.** The user may be seeing stale behavior from a prior build. No code change needed — the current implementation already:
- Filters expenses client-side when any avatar is tapped
- Shows stroke on whichever avatar is selected (not tied to current user)
- Deselects on second tap

**Action**: No change. Confirm this works after the other fixes are deployed in the same build.

---

## Fix 2 — Groups Page: Dark Tint on Cards + Primary Join Button

**Dark tint on group cards**: Each card currently uses inline `backgroundImage` style. Add a dark overlay inside the button, above the background but below the text content. Use `bg-black/35` matching the hero overlay.

**Join button**: Change from dashed ghost style to primary filled button (`bg-primary text-primary-foreground rounded-full font-bold`).

**File**: `src/pages/Groups.tsx`
- Wrap card content in a relative container; add an `absolute inset-0 bg-black/35 rounded-[16px]` div as first child
- Change "Join a group" button from dashed border style to `bg-primary text-primary-foreground rounded-full py-4 font-bold text-base`

---

## Fix 3 — BottomNav on /join Page

**Current state**: `Join.tsx` renders no `BottomNav`. The page uses `screen-container` with centered content.

**Fix**: Import and render `BottomNav` at the bottom of the Join page. Add `pb-24` to ensure content isn't obscured. The `onFabPress` handler navigates to the last group dashboard (same pattern as Groups page).

**File**: `src/pages/Join.tsx`
- Import `BottomNav`
- Add `pb-24` to the content wrapper
- Render `<BottomNav onFabPress={...} />` before closing `</div>`

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Groups.tsx` | Dark overlay on group cards; primary style on Join button |
| `src/pages/Join.tsx` | Add BottomNav + bottom padding |

## Files NOT Changed

MemberAvatarRow, Dashboard, AppContext, RPCs, RLS, auth, settlement, avatar-utils, ExpenseScreen.

