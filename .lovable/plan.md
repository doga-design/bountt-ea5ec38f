## Pre-Launch Fixes: Confetti, Avatar Collision, Admin Transfer

### Files touched

- `src/components/dashboard/ExpenseDetailSheet.tsx` (Fix 1)
- `src/lib/avatar-utils.ts` (Fix 2 — no changes needed, already correct)
- `src/components/group-settings/DangerZone.tsx` (Fix 3)
- `src/types/index.ts` (Fix 3 — if context type needs update)
- `src/contexts/AppContext.tsx` (Fix 3 — wire `transferGroupOwnership`)
- 1 database migration (Fix 2 — unique constraint + drop old RPCs)

Before implementing Fix 1, trace the full confetti path and confirm every step is working: does the auto-close effect fire after settlement, does it call `onSettled`, does `handleSettlementComplete` set `pendingConfettiRef.current = true`, does `handleDetailOpenChange(false)` read it and fire confetti. If any step is broken, identify and fix it before removing `celebratePendingRef`.

For Fix 2 backfill, use a PL/pgSQL DO block that assigns only indices 1-6 not already taken in each group — do not use sequential row numbering which could collide with existing values.

For Fix 3, placeholders must not appear as selectable transfer targets in the member picker. Only active non-placeholder real members should be listed.

---

### Fix 1 — Confetti

**Current state:** The auto-close effect (ExpenseDetailSheet lines 83-93) correctly detects settlement transition and calls `onSettled?.()` → Dashboard's `handleSettlementComplete` → sets `pendingConfettiRef.current = true` → `onOpenChange(false)` → Dashboard's `handleDetailOpenChange` reads the ref and fires confetti. This path is correctly wired.

`celebratePendingRef` (line 65) in ExpenseDetailSheet is dead code — declared, checked in `handleClose` (line 283), but never set to true anywhere. It's a vestige of an earlier approach.

**Fix:** Remove `celebratePendingRef` entirely — the declaration (line 65), and the check in `handleClose` (lines 283-286). The auto-close path through Dashboard's `pendingConfettiRef` is the correct and working mechanism.

**Risk:** The auto-close effect depends on `expenseFullySettled` updating via realtime → refetch → state update while the drawer is still open. If the refetch is slow, the 800ms delay timer might need adjustment. But the logic is sound — this is a cleanup, not a behavioral change.

---

### Fix 2 — Avatar collision

**Part A — DB unique constraint (migration):**

```sql
-- Clean up any existing duplicates first (keep lowest id)
DELETE FROM group_members a
USING group_members b
WHERE a.group_id = b.group_id
  AND a.avatar_index = b.avatar_index
  AND a.status = 'active'
  AND b.status = 'active'
  AND a.id > b.id;

-- Add unique partial index
CREATE UNIQUE INDEX idx_unique_avatar_index_per_group
ON group_members (group_id, avatar_index)
WHERE status = 'active' AND avatar_index IS NOT NULL;
```

**Part B — Drop old 3-param RPC overloads that don't set avatar_index:**

```sql
DROP FUNCTION IF EXISTS public.join_group(uuid, text, text);
DROP FUNCTION IF EXISTS public.add_placeholder_member(uuid, text, text);
DROP FUNCTION IF EXISTS public.create_group_with_creator(uuid, text, text, text, text);
```

Wait — `create_group_with_creator` 5-param takes `(text, text, text, text, text)` not `(uuid, ...)`. Need to match exact signatures. Will verify in migration.

**Part C — Backfill NULL avatar_index values:**

```sql
-- For each group, assign sequential indexes to members with NULL avatar_index
WITH numbered AS (
  SELECT id, group_id,
    ROW_NUMBER() OVER (PARTITION BY group_id ORDER BY joined_at) as rn
  FROM group_members
  WHERE avatar_index IS NULL AND status = 'active'
)
UPDATE group_members gm
SET avatar_index = n.rn
FROM numbered n
WHERE gm.id = n.id
  AND n.rn <= 6;
```

This needs care to avoid conflicts with existing non-null indexes in the same group. More precise approach:

```sql
WITH existing AS (
  SELECT group_id, array_agg(avatar_index) as used
  FROM group_members
  WHERE avatar_index IS NOT NULL AND status = 'active'
  GROUP BY group_id
),
to_fix AS (
  SELECT gm.id, gm.group_id,
    ROW_NUMBER() OVER (PARTITION BY gm.group_id ORDER BY gm.joined_at) as rn
  FROM group_members gm
  WHERE gm.avatar_index IS NULL AND gm.status = 'active'
)
-- This is complex in pure SQL. Will use a DO block with a loop.
```

Will implement as a PL/pgSQL DO block that iterates and assigns the first available index per group.

---

### Fix 3 — Admin transfer before leave

**What exists:** `transfer_group_ownership` RPC exists in DB. `DangerZone.tsx` blocks sole admin from leaving with a toast message and disabled button. No UI to select a successor. Dead end.

**What to build:**

1. **In DangerZone.tsx** — When `isSoleAdmin` is true and user taps "Leave Group", show a member selection dialog instead of blocking. List all active non-placeholder members (excluding self). Tapping a member calls `transfer_group_ownership` RPC, then calls `leaveGroup`.
2. **In AppContext.tsx** — Add `transferOwnership(groupId, newOwnerId)` function that calls the RPC and refetches group data.

**UI approach:** Reuse `AlertDialog` pattern already in DangerZone. When sole admin taps Leave:

- Show dialog: "Choose a new admin before leaving"
- List active non-placeholder members with their avatars
- Tap member → confirm → transfer → leave → navigate home

**Flow:**

1. User taps Leave Group
2. If `isSoleAdmin` and other real members exist → show member picker dialog
3. If `isSoleAdmin` and NO other real members → show "Delete the group or add another member first" (current behavior, but only for groups with only placeholders)
4. User selects successor → `transferOwnership()` → `leaveGroup()` → navigate to `/`
5. If not sole admin → show current leave confirmation dialog (unchanged)

---

### What stays the same

All settlement logic, expense creation, auth flows, realtime subscriptions, routing — untouched.