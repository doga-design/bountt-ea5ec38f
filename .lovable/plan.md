
# Fix Member Color Assignment

## Problem
Currently, avatar colors are derived by hashing the member's UUID against a 6-color palette. This causes frequent color collisions (multiple members get the same color). Placeholder members get no color at all (`undefined`).

## Solution
Store a persistent `avatar_color` on each `group_members` row, assigned at creation time. When adding a new member, pick a color from an expanded 10-color palette that is not yet used by other active members in the same group (or pick randomly if all are taken).

## Changes

### 1. Database Migration
Add a nullable `avatar_color` text column to `group_members`. Then backfill existing rows with deterministic colors from the current hash logic so nothing changes visually for existing data.

```
ALTER TABLE public.group_members ADD COLUMN avatar_color text;
```

Backfill existing members using the same hash logic currently in the frontend, so colors stay consistent for existing users.

### 2. Update `src/lib/avatar-utils.ts`
- Expand palette to 10 colors
- Add a new helper `pickAvailableColor(existingColors: string[]): string` that picks a color not yet used by other group members (falls back to random if all taken)
- Update `getAvatarColor(member)` to simply return `member.avatar_color` if it exists, falling back to the hash-based logic for any un-migrated rows

### 3. Update `src/types/index.ts`
Add `avatar_color: string | null` to the `GroupMember` interface.

### 4. Update `src/contexts/AppContext.tsx`
When calling `addPlaceholderMember`, compute the next available color by checking existing group members' colors, then pass it to the database insert.

### 5. Update All Consumers
Files that call `getAvatarColor(member.id)` will be updated to call `getAvatarColor(member)` (passing the full member object so it can read `avatar_color`):
- `src/components/dashboard/MemberCard.tsx`
- `src/components/dashboard/ExpenseCard.tsx`
- `src/components/dashboard/DashboardHeader.tsx`
- `src/components/group-settings/MemberDetailSheet.tsx`

Placeholder members will no longer get `undefined` -- they will have a real assigned color like everyone else.

### 6. Handle Join Flow
When a real user joins a group (not placeholder), also assign them a color. This happens in the existing join RPC / insert logic in AppContext.

---

## Technical Details

**10-Color Palette:**
Blue (#3B82F6), Pink (#EC4899), Green (#10B981), Orange (#F97316), Purple (#8B5CF6), Teal (#14B8A6), Red (#EF4444), Amber (#F59E0B), Indigo (#6366F1), Rose (#F43F5E)

**Color picking logic:**
1. Get all `avatar_color` values from active members in the same group
2. Filter palette to unused colors
3. Pick randomly from unused colors
4. If all 10 are taken, pick randomly from full palette
