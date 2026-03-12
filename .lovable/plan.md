# Redesign "ALL MEMBERS" Section — Circular Avatar Row

## Overview

Replace the current wide card-based `MemberCardScroll` with a circular avatar row matching the reference screenshots. Add inline placeholder invite card with slide-down animation.

## Files to Change

### 1. New: `src/components/dashboard/MemberAvatarRow.tsx`

Complete replacement for `MemberCardScroll`. Contains all logic for the new row.

**Structure:**

```text
┌─ "ALL MEMBERS" label (tracking-wider, text-xs, muted, uppercase) ─┐
│                                                                     │
│  ○ You    ○ Kyle    ○ Matt    ◐ (pie icon, disabled)               │
│  (green   (ghost   (green                                           │
│   dot)    emoji)    dot)                                            │
│                                                                     │
│  ┌─ Inline invite card (slide-down, only for placeholders) ──────┐ │
│  │ 👻  "Kyle is still a placeholder..."                          │ │
│  │     [ Invite Kyle → ]                                         │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

**Props:** `members`, `currentUserId`, `groupInviteCode?`

**Key implementation details:**

- Sort members: current user first, then real (non-placeholder active) members, then placeholders
- Each avatar: 56px circle with `getAvatarColor` background, `getAvatarImage` PNG inside  
Use the existing avatar utilities:
  - getAvatarImage(member) → returns the PNG import for that member
  - member.avatar_color → the hex color string for the circle background
  Both are already in src/lib/avatar-utils.ts — do not create new functions.
- Name label below: 12px, current user shows "You"
- Green dot (10px, `#22C55E`): positioned top-right for real joined members
- Ghost emoji overlay: positioned top-right for placeholder members (small, ~16px badge)
- Active/selected state: `#D94F00` ring border (2.5px) — "You" selected by default
- Pie chart icon at end: 56px circle, light gray border, clock/pie icon inside, `opacity: 0.4`, `pointer-events: none`
- `useState` for `selectedMemberId` (defaults to current user's member ID)
- `useState` for `inviteCardMemberId` (null by default)
- Tapping placeholder: set as selected + show invite card with CSS transition (`max-height` + `opacity` animation)
- Tapping real member: set as selected, clear invite card
- Tapping outside (click-away): dismiss invite card
- `// TODO: filter feed by selected member`

**Invite card (inline, not modal):**

- Rounded card, light background, padding
- Ghost icon on left
- Text: `<span className="text-orange-600 font-semibold">{name}</span> is still a placeholder...`
- Button: dark navy (`#1E293B`), full-width, "Invite {name} →"
- Button copies invite link or navigates to invite flow; The "Invite [Name] →" button should copy the group invite link to clipboard (using navigator.clipboard.writeText) 
  and show a brief toast: "Invite link copied!". 
  Do not open a new sheet or navigate away.
- Slide-down animation: `transition-all duration-300` with conditional `max-height`/`opacity`

### 2. Modify: `src/pages/Dashboard.tsx`

- Replace `MemberCardScroll` import with `MemberAvatarRow`
- Replace the `<MemberCardScroll ... />` usage (lines 130-138) with:

```tsx
<div className="mt-4">
  <MemberAvatarRow
    members={groupMembers}
    currentUserId={user?.id ?? ""}
    groupInviteCode={currentGroup?.invite_code}
  />
</div>
```

- Remove `MemberDetailSheet` trigger from member tap (the old `onCardClick={setSelectedMember}` flow is replaced by the new inline selection)
- Keep `MemberDetailSheet` available but don't wire it to the new row (the new row handles its own interaction) In Dashboard.tsx, remove the selectedMember useState and 
  setSelectedMember calls entirely if they were only used 
  by MemberCardScroll. Do not leave orphaned state.

### 3. Keep (no changes): `MemberCardScroll.tsx`, `MemberCard.tsx`

These files become unused by the dashboard but are left in place in case other screens reference them. Can be cleaned up later.

### Not touched

ExpenseScreen, numpad, expense logic, AppContext, Supabase queries, feed cards — none modified.