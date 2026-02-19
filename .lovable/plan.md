

# Visual Member System + Group Settings Overhaul

## Overview

This is a major UI overhaul touching the dashboard header, member card system, and group settings page. The work breaks down into 5 implementation phases executed in sequence.

---

## Phase 1: Foundation -- Avatar Colors + Utility Functions

### New file: `src/lib/avatar-utils.ts`
- Deterministic color assignment from 6-color palette (#3B82F6, #EC4899, #10B981, #F97316, #8B5CF6, #14B8A6) based on member ID hash
- `getAvatarColor(memberId: string): string` -- hashes the ID and picks a color index
- `getMemberBalance(memberId: string, expenses: Expense[], splits: ExpenseSplit[], currentUserId: string): { amount: number; direction: 'you_pay' | 'they_pay' | 'settled' }` -- calculates the net financial relationship between the current user and a specific member

### Balance calculation per member
For each member, compute:
- Sum of all unsettled expenses where YOU paid and THEY have a split = what they owe you
- Sum of all unsettled expenses where THEY paid and YOU have a split = what you owe them
- Net = (what they owe you) - (what you owe them)
- Positive net = "They pay you $X", Negative net = "You pay $X", Zero = "All settled"

---

## Phase 2: Redesign Dashboard Header

### Rewrite: `src/components/dashboard/DashboardHeader.tsx`

Match `hero-banner-style.png` exactly:

**Layout changes:**
- Remove `rounded-b-3xl` (straight edges)
- Height ~200px total
- Add black strip at absolute bottom (4px height, full width)

**Element positioning (top to bottom, left to right):**

Top row:
- Left: Overlapping member avatars (40px circles, white 2px borders, each shifted ~-12px margin-left)
  - Current user: smiley emoji avatar with white circular background + colored border matching palette
  - Placeholder members: ghost icon on grey/muted circle
  - Real members: User icon on colored circle (color from `getAvatarColor`)
  - "+" button: white/light circle with plus icon at end of row
- Right: Settings gear icon (white, outline style, ~40px)

Bottom row:
- Left: Group name in bold white text (~text-2xl font-bold)
- Right: BalancePill component (semi-transparent orange-white pill)

Emoji avatar:
- Large white circle (56px) with group emoji centered
- Positioned at bottom-left, overlapping the orange/white boundary (translate-y to sit half on each)

### Update: `src/components/dashboard/BalancePill.tsx`
- Restyle to match screenshot: larger text, semi-transparent orange-tinted background (`bg-white/20`), rounded-xl, with Layers icon
- Display "$X owed" or "$X owing"

---

## Phase 3: Member Card Components

### New file: `src/components/dashboard/MemberCard.tsx` (Dashboard version, different from group-settings version)

Two visual variants based on `is_placeholder`:

**Placeholder card:**
- Background: `bg-muted` (light gray)
- Left: Ghost emoji (text) in a circle
- Top row: ghost icon + name (bold) + arrow-up-right icon (right-aligned)
- Bottom row: balance text ("You pay $X" / "They pay $X" / "All settled") + amount
- Rounded-xl, ~280px wide, full content height
- Tappable (active:scale-[0.98])

**Real user card:**
- Background: `bg-white`
- Left: Colored circle avatar (from palette) with User icon
- Same layout as placeholder otherwise
- Arrow-up-right icon on right

### New file: `src/components/dashboard/MemberCardScroll.tsx`
- Horizontal scrolling container for member cards
- Uses `overflow-x-auto` with `chip-scroll` class (hide scrollbar)
- `flex gap-3` layout
- Shows partial next card to hint at scroll
- Each card is `min-w-[260px]` flex-shrink-0
- Used in both Dashboard (normal mode) and GroupSettings

---

## Phase 4: Dashboard Integration

### Update: `src/pages/Dashboard.tsx`
- In "normal" mode: render `MemberCardScroll` between header and expense feed
- Pass member balance data to each card
- Card tap opens a member detail bottom sheet (Phase 5)

### Update: `src/components/dashboard/EmptyState.tsx`
- No changes needed (already works)

### Update: `src/components/dashboard/AddExpensePrompt.tsx`
- No changes needed

---

## Phase 5: Group Settings Page Overhaul

### Rewrite: `src/pages/GroupSettings.tsx`
Full page with sections:
1. Hero banner (reuses gradient system)
2. Members section with horizontal card scroll + "+ Add Member" card at end
3. Settings cards (group name, invite link)
4. Danger zone

### Update: `src/components/group-settings/GroupBanner.tsx`
- Remove rounded edges
- Keep 200px height with gradient
- Inline editable group name (white text, tap to edit)
- Tap background area opens GradientPicker
- Group emoji in white circle overlapping bottom edge

### Update: `src/components/group-settings/GradientPicker.tsx`
- Add a 6th option: solid orange (the default)
- Show "Choose a banner" title
- Grid of 6 swatches
- Selected has orange border

### New file: `src/components/group-settings/AddMemberSheet.tsx`
- Bottom sheet (Vaul Drawer)
- Title: "Add to [Group Name]"
- Text input for friend's name
- Explanation text about placeholders
- "Add as Placeholder" primary button + "Cancel"
- On submit: calls `addPlaceholderMember`

### New file: `src/components/group-settings/MemberDetailSheet.tsx`
- Bottom sheet opened when tapping a member card
- **Placeholder variant:** Ghost icon, name, "Not on Bountt yet" badge (yellow dot), balance summary, expense list, actions (Invite, Edit Name, Remove if admin)
- **Real user variant:** Colored avatar, name, role badge, "Active" green dot, balance summary, shared expenses, actions (View Expenses, Settle Up, Remove if admin)

### Update: `src/components/group-settings/MembersList.tsx`
- Replace vertical list with horizontal card scroll
- Use the same `MemberCard` component from Phase 3
- Add "+ Add Member" card at end of scroll (dashed border, gray bg, centered text)
- Tap "+ Add Member" opens `AddMemberSheet`
- Tap any member card opens `MemberDetailSheet`

### Keep existing: `src/components/group-settings/SettingsCards.tsx`
- Already has Group Name edit and Invite Link -- keep as-is

### Keep existing: `src/components/group-settings/DangerZone.tsx`
- Already has Leave Group and Delete Group -- keep as-is

---

## Phase 6: Database -- No Migration Needed

The existing schema already has:
- `groups.banner_gradient` (text, default 'orange-red')
- `group_members.status` (text, default 'active')
- `group_members.role` (text, default 'member')
- `group_members.left_at` (timestamptz, nullable)
- `group_members.is_placeholder` (boolean)
- `groups.deleted_at` (timestamptz, nullable)

No new columns needed. The `banner_gradient` field already stores the gradient name. Adding a "solid orange" option just means storing `"solid-orange"` as a new gradient value.

---

## Technical Details

### Avatar Color Algorithm
```text
function getAvatarColor(memberId: string): string {
  const COLORS = ['#3B82F6', '#EC4899', '#10B981', '#F97316', '#8B5CF6', '#14B8A6'];
  let hash = 0;
  for (let i = 0; i < memberId.length; i++) {
    hash = memberId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}
```

### Per-Member Balance Calculation
For member M vs current user U:
- `theyOweYou` = sum of M's split amounts on expenses where U paid (unsettled)
- `youOweThem` = sum of U's split amounts on expenses where M paid (unsettled)
- `net = theyOweYou - youOweThem`
- If net > 0: "They pay you $net"
- If net < 0: "You pay $|net|"
- If net === 0: "All settled"

### Files Created (new)
1. `src/lib/avatar-utils.ts`
2. `src/components/dashboard/MemberCard.tsx` (dashboard card)
3. `src/components/dashboard/MemberCardScroll.tsx`
4. `src/components/group-settings/AddMemberSheet.tsx`
5. `src/components/group-settings/MemberDetailSheet.tsx`

### Files Modified
1. `src/components/dashboard/DashboardHeader.tsx` -- full redesign
2. `src/components/dashboard/BalancePill.tsx` -- restyle
3. `src/pages/Dashboard.tsx` -- add member card scroll
4. `src/pages/GroupSettings.tsx` -- restructure with new components
5. `src/components/group-settings/GroupBanner.tsx` -- remove rounded edges, add emoji overlap
6. `src/components/group-settings/GradientPicker.tsx` -- add solid orange option
7. `src/components/group-settings/MembersList.tsx` -- horizontal scroll + add member + detail sheet

### Implementation Order
1. `avatar-utils.ts` (foundation)
2. `DashboardHeader.tsx` redesign (visual impact)
3. `BalancePill.tsx` restyle
4. `MemberCard.tsx` + `MemberCardScroll.tsx` (card system)
5. `Dashboard.tsx` integration
6. `AddMemberSheet.tsx` + `MemberDetailSheet.tsx`
7. `GroupSettings.tsx` + `MembersList.tsx` overhaul
8. `GroupBanner.tsx` + `GradientPicker.tsx` updates

