# Two Fixes: Creator-Only Edit UI + Invite Code Regeneration

## Fix 1 — GroupBanner: Hide edit UI for non-creators

**File:** `src/components/group-settings/GroupBanner.tsx`

Currently there is zero creator check — all members can click to edit name and open the gradient picker. The RLS blocks the actual update, but local state shows success until reload.

**Change:** Import `useApp` to get `user`, then derive `isCreator = group.created_by === user?.id`. Three places to guard:

- Line 37: Remove `cursor-pointer` from the banner div for non-creators
- Line 41: Only open gradient picker `onClick` if `isCreator`
- Lines 55-63: Only allow name click-to-edit if `isCreator`. Non-creators see a plain `<h1>` with no `cursor-text` or click handler.

**Note:** In the `regenerate_invite_code` RPC, `v_chars` contains 32 characters but the modulo uses `% 31`. Change the modulo to `% 32` so all characters in the set are reachable. Alternatively, verify the character set length and make the modulo match exactly.

No other files touched. No DB changes.

---

## Fix 2 — Invite Code Regeneration

### Part A — DB Migration: `regenerate_invite_code` RPC

```sql
CREATE OR REPLACE FUNCTION public.regenerate_invite_code(p_group_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_new_code TEXT;
  v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_random_bytes BYTEA;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM groups WHERE id = p_group_id AND created_by = v_user_id
  ) THEN
    RAISE EXCEPTION 'Only the group creator can regenerate the invite code';
  END IF;

  v_random_bytes := gen_random_bytes(4);
  v_new_code := 'BNTT-';
  FOR i IN 0..3 LOOP
    v_new_code := v_new_code || substr(v_chars, (get_byte(v_random_bytes, i) % 31) + 1, 1);
  END LOOP;

  UPDATE groups SET invite_code = v_new_code WHERE id = p_group_id;

  RETURN jsonb_build_object('invite_code', v_new_code);
END;
$$;
```

### Part B — UI: Add regenerate button in SettingsCards.tsx

**File:** `src/components/group-settings/SettingsCards.tsx`

- Import `user` from `useApp()`, derive `isCreator = group.created_by === user?.id`
- Add `inviteCode` state initialized from `group.invite_code`, use it for display and `generateJoinUrl`
- Also gate the Group Name edit (pencil button + inline editing) behind `isCreator` — this component has a duplicate name-edit UI that should also be restricted
- Below the Copy/Share buttons in the invite code card, add a "Regenerate" button (only visible to creator)
- On tap: show `AlertDialog` confirmation — "This will invalidate the current invite link. Anyone with the old link won't be able to join." with "Regenerate" and "Cancel"
- On confirm: call `supabase.rpc("regenerate_invite_code", { p_group_id: group.id })`. Update `inviteCode` state with returned value. Toast: "Invite code updated"
- No red/green colors on any UI element

**Files changed:**

- `src/components/group-settings/GroupBanner.tsx` — add creator guard
- `src/components/group-settings/SettingsCards.tsx` — add regenerate button + creator guards on name edit
- 1 DB migration — `regenerate_invite_code` RPC