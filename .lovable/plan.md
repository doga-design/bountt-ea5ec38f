

# Complete Avatar System Replacement

## Step 1 — Database Migration (single migration)

**Add column + backfill + color migration + RPC updates:**

```sql
-- Add avatar_index column
ALTER TABLE group_members ADD COLUMN avatar_index integer;

-- Backfill using current UUID hash algorithm (preserves visual continuity)
UPDATE group_members 
SET avatar_index = (('x' || left(replace(id::text, '-', ''), 8))::bit(32)::int % 5) + 1
WHERE avatar_index IS NULL;

-- Migrate hex colors to named keys
UPDATE group_members SET avatar_color = 'blue'     WHERE avatar_color = '#3B82F6';
UPDATE group_members SET avatar_color = 'purple'   WHERE avatar_color = '#8B5CF6';
UPDATE group_members SET avatar_color = 'orange'   WHERE avatar_color = '#F97316';
UPDATE group_members SET avatar_color = 'amber'    WHERE avatar_color = '#F59E0B';
UPDATE group_members SET avatar_color = 'emerald'  WHERE avatar_color = '#10B981';
UPDATE group_members SET avatar_color = 'purple'   WHERE avatar_color = '#14B8A6';
UPDATE group_members SET avatar_color = 'amber'    WHERE avatar_color = '#EF4444';
UPDATE group_members SET avatar_color = 'blue'     WHERE avatar_color = '#6366F1';
UPDATE group_members SET avatar_color = 'amber'    WHERE avatar_color = '#F43F5E';
UPDATE group_members SET avatar_color = 'amber'    WHERE avatar_color = '#EC4899';

-- Fallback: any remaining unrecognized values → purple
UPDATE group_members 
SET avatar_color = 'purple'
WHERE avatar_color NOT IN ('emerald','blue','amber','orange','offwhite','purple');
```

**Update 3 RPCs** to accept `p_avatar_index integer`:
- `join_group` — add param, store in INSERT and rejoin UPDATE
- `add_placeholder_member` — add param, store in INSERT
- `create_group_with_creator` — add param, store in INSERT

`claim_placeholder` — untouched.

## Step 2 — Copy 6 SVG files

Copy uploaded SVGs to `src/assets/avatars/avatar1.svg` through `avatar6.svg`. Old PNGs kept until confirmed working.

## Step 3 — Update `src/types/index.ts`

Add `avatar_index: number | null` to `GroupMember` interface (after `avatar_color` field, line 36).

## Step 4 — Rewrite `src/lib/avatar-utils.ts`

Complete replacement:
- `AVATAR_COLORS` → `Record<string, {bg, stroke}>` with 6 named keys
- `AVATAR_IMAGES` → 6 SVG imports
- `getAvatarColor(member)` → returns `{bg, stroke}`, fallback purple
- `getAvatarImage(member)` → reads `member.avatar_index`, fallback index 1
- `getAvatarImageFromName(name)` → hash mod 6
- `pickAvailableColor(existingColors, existingIndices)` → returns `{color, index}`
- `getMemberBalance` — unchanged

## Step 5 — Update assignment locations

**`AppContext.tsx` createGroup (line 158):**
- `pickAvailableColor([], [])` → pass both `p_avatar_color` and `p_avatar_index` to RPC

**`AppContext.tsx` addPlaceholderMember (lines 241-244):**
- Gather existing colors AND indices from active members
- Call `pickAvailableColor(existingColors, existingIndices)`
- Pass both to RPC

**`Join.tsx` joinAsNewMember (lines 168-191):**
- Query both `avatar_color` and `avatar_index` from existing members
- Call updated `pickAvailableColor`
- Pass both to RPC

**`Join.tsx` rejoin path (lines 66-111):**
- Also query `avatar_index` for active members and the rejoining member
- If color is invalid named key OR index is null/colliding → reassign both
- If valid and non-colliding → preserve, update both fields in the UPDATE

## Step 6 — Update all avatar-rendering components

Mechanical destructuring in 9 files:
- `PayerAvatar.tsx` — line 11: `const { bg } = getAvatarColor(payer)`, use `bg`
- `CustomSplitRows.tsx` — line 31: same pattern
- `ExpenseSpokeViz.tsx` — line 103: `payer ? getAvatarColor(payer).bg : '#B984E5'`; line 221: same for members
- `ExpenseFeedItem.tsx` — line 23: `member ? getAvatarColor(member).bg : '#DFDFDF'`; line 61: `.bg`
- `ExpenseSettledState.tsx` — line 30: fallback `'#B984E5'`
- `DashboardHeader.tsx` — line 47: destructure `.bg`
- `MemberAvatarRow.tsx` — line 90: destructure `.bg`
- `MemberCard.tsx` (dashboard) — line 15: destructure `.bg`
- `MemberDetailSheet.tsx` — line 56: destructure `.bg`

## Step 7 — Update `MemberAvatarGrid.tsx` stroke

Line 120/136-137: Extract `{ bg, stroke }` per member. Replace:
```
backgroundColor: isActive ? color : "#E0E0DC"
border: isActive ? "3px solid white" : "3px solid transparent"
```
With:
```
backgroundColor: isActive ? bg : "#E0E0DC"
border: isActive ? `3px solid ${stroke}` : "3px solid white"
```

## Step 8 — Fix `group-settings/MemberCard.tsx`

Replace generic `<User>` Lucide icon (line 95) with proper avatar: `getAvatarColor(member).bg` background + `getAvatarImage(member)` image, 40px circle. Import both functions.

## Files changed

| File | Change |
|------|--------|
| Migration SQL | Column + backfill + color migration + 3 RPC updates |
| 6 SVG files | New assets copied from uploads |
| `src/types/index.ts` | Add `avatar_index` field |
| `src/lib/avatar-utils.ts` | Full rewrite |
| `src/contexts/AppContext.tsx` | 2 assignment locations |
| `src/pages/Join.tsx` | 2 assignment locations |
| `src/components/expense/MemberAvatarGrid.tsx` | Stroke border |
| `src/components/expense/PayerAvatar.tsx` | Destructure bg |
| `src/components/expense/CustomSplitRows.tsx` | Destructure bg |
| `src/components/dashboard/ExpenseSpokeViz.tsx` | Destructure bg |
| `src/components/dashboard/ExpenseFeedItem.tsx` | Destructure bg |
| `src/components/dashboard/ExpenseSettledState.tsx` | Destructure bg |
| `src/components/dashboard/DashboardHeader.tsx` | Destructure bg |
| `src/components/dashboard/MemberAvatarRow.tsx` | Destructure bg |
| `src/components/dashboard/MemberCard.tsx` | Destructure bg |
| `src/components/group-settings/MemberDetailSheet.tsx` | Destructure bg |
| `src/components/group-settings/MemberCard.tsx` | Replace icon with avatar |

## Not changed
Settlement logic, expense logic, routing, `claim_placeholder` RPC, no new dependencies.

