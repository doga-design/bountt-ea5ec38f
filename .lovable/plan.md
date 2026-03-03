# Bountt — Ghost Emoji Elimination + "+" Button Redesign

## Fix 1: Ghost emoji elimination (global)

Five files currently render ghost emojis or generic `User` icons instead of the deterministic PNG avatars. Each must be updated to use `getAvatarImage(member)` from `@/lib/avatar-utils`.

### 1a. `src/components/dashboard/MemberCard.tsx` (line 42-46)

- Remove `Ghost` and `User` imports from lucide
- Import `getAvatarImage` from `@/lib/avatar-utils`
- Replace the conditional ghost/User icon block with an `<img>` tag using `getAvatarImage(member)`, styled as a circular avatar (same 40x40 size, `object-contain`, ~75% inner size)

### 1b. `src/components/dashboard/DashboardHeader.tsx` (line 61-67)

- Import `getAvatarImage` from `@/lib/avatar-utils`
- Replace the three-way conditional (smiley for current user, ghost for placeholder, User icon for others) with a single `<img>` using `getAvatarImage(member)` for ALL members including current user
- Keep the colored background circle

### 1c. `src/components/group-settings/MemberDetailSheet.tsx` (line 80-84)

- Import `getAvatarImage` from `@/lib/avatar-utils`
- Replace the ghost/User conditional with `<img src={getAvatarImage(member)}>`
- Keep the 48x48 colored circle wrapper

### 1d. `src/components/join/PlaceholderSelectDialog.tsx` (line 63-64)

- Import `getAvatarImage` from `@/lib/avatar-utils`
- Replace the ghost emoji with `<img src={getAvatarImage(p)}>` (the placeholder objects have an `id` field, which is all `getAvatarImage` needs)
- Use the member's `avatar_color` via `getAvatarColor` for the background circle

In `ActivityLog.tsx` and `ExpenseDetailSheet.tsx`, where avatars are rendered from historical snapshots (deleted members, activity log entries), use `getAvatarImageFromName(snapshot.member_name)` instead of `getAvatarImage(member)`. Ensure `avatar-utils.ts` exports this function. If it doesn't exist yet, add it:

```ts
export function getAvatarImageFromName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_IMAGES[Math.abs(hash) % AVATAR_IMAGES.length]
}
```"
```

  
  
Fix 2: "+" button redesign

### 2a. `src/components/expense/MemberAvatarGrid.tsx`

- Remove the standalone "+" button block entirely (lines 112-136)
- Remove `onAddMember` from props interface
- Remove `Plus` import from lucide
- Remove `totalSlots` calculation (revert to just `memberCount` for arc width)
- The dashed arc SVG width should use `memberCount` slots only (not memberCount + 1) The dashed arc SVG should span from the leftmost avatar to the rightmost avatar only. Its width = `(memberCount * (avatarSize + gap)) - gap`. Do not include the "+" button slot in this calculation.

### 2b. `src/components/expense/ExpenseScreen.tsx` (around line 649-658)

- Wrap the `MemberAvatarGrid` in a `<div className="relative">` container
- Add an absolutely positioned "+" button as a sibling:
  - 36x36px white circle
  - `border: 1.5px solid #E2E2DE`
  - `boxShadow: 0 2px 8px rgba(0,0,0,0.10)`
  - Centered `Plus` icon, 18px, color `#888`
  - `position: absolute`, `top: 0` (vertically at top of grid), `right: -10px`
  - `z-index: 10`
  - No label text
  - `onClick={() => setShowAddMember(true)}`
- The existing `AddMemberSheet` integration and auto-select logic stays as-is
- Remove the `onAddMember` prop from the `MemberAvatarGrid` call

---

## Files Modified


| File                                                  | Changes                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------ |
| `src/components/dashboard/MemberCard.tsx`             | Replace ghost/User icon with PNG avatar via `getAvatarImage` |
| `src/components/dashboard/DashboardHeader.tsx`        | Replace ghost/smiley/User with PNG avatar for all members    |
| `src/components/group-settings/MemberDetailSheet.tsx` | Replace ghost/User with PNG avatar                           |
| `src/components/join/PlaceholderSelectDialog.tsx`     | Replace ghost emoji with PNG avatar                          |
| `src/components/expense/MemberAvatarGrid.tsx`         | Remove "+" button, remove `onAddMember` prop, fix arc width  |
| `src/components/expense/ExpenseScreen.tsx`            | Add absolute "+" button wrapper around MemberAvatarGrid      |
