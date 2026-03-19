
-- ============================================================
-- FIX 1: Block direct INSERT on group_members
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can join groups" ON group_members;
CREATE POLICY "Block direct inserts on group_members"
ON group_members FOR INSERT TO public
WITH CHECK (false);

-- FIX 1A: Create join_group RPC
CREATE OR REPLACE FUNCTION public.join_group(p_group_id uuid, p_display_name text, p_avatar_color text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_member JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check not already active member
  IF EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = v_user_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Already a member of this group';
  END IF;

  -- Check group exists and not deleted
  IF NOT EXISTS (
    SELECT 1 FROM groups WHERE id = p_group_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  -- Handle rejoin (previously left)
  IF EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = v_user_id AND status = 'left'
  ) THEN
    UPDATE group_members
    SET status = 'active', left_at = NULL, avatar_color = p_avatar_color
    WHERE group_id = p_group_id AND user_id = v_user_id AND status = 'left'
    RETURNING to_jsonb(group_members.*) INTO v_member;
    RETURN v_member;
  END IF;

  -- Insert new member
  INSERT INTO group_members (group_id, user_id, name, is_placeholder, avatar_color)
  VALUES (p_group_id, v_user_id, p_display_name, false, p_avatar_color)
  RETURNING to_jsonb(group_members.*) INTO v_member;

  RETURN v_member;
END;
$$;

-- FIX 1B: Create add_placeholder_member RPC
CREATE OR REPLACE FUNCTION public.add_placeholder_member(p_group_id uuid, p_name text, p_avatar_color text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_member JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT is_group_member(p_group_id, v_user_id) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  INSERT INTO group_members (group_id, user_id, name, is_placeholder, avatar_color)
  VALUES (p_group_id, NULL, p_name, true, p_avatar_color)
  RETURNING to_jsonb(group_members.*) INTO v_member;

  RETURN v_member;
END;
$$;

-- ============================================================
-- FIX 2: Block self-role-promotion
-- ============================================================
DROP POLICY IF EXISTS "Members can update their own record" ON group_members;
CREATE POLICY "Members can update own safe fields"
ON group_members FOR UPDATE TO public
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND role = (SELECT gm.role FROM group_members gm WHERE gm.id = group_members.id)
);

-- ============================================================
-- FIX 3 + 4: Harden create_expense_with_splits — remove p_created_by, validate payer
-- ============================================================
-- Drop both overloads
DROP FUNCTION IF EXISTS public.create_expense_with_splits(uuid, numeric, text, uuid, text, uuid, jsonb);
DROP FUNCTION IF EXISTS public.create_expense_with_splits(uuid, numeric, text, uuid, text, uuid, jsonb, text);

CREATE OR REPLACE FUNCTION public.create_expense_with_splits(
  p_group_id uuid,
  p_amount numeric,
  p_description text,
  p_paid_by_user_id uuid,
  p_paid_by_name text,
  p_splits jsonb,
  p_expense_type text DEFAULT 'split'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor_id UUID;
  v_expense_id UUID;
  v_expense JSONB;
  v_member_names TEXT[];
  v_actor_name TEXT;
  v_split_sum NUMERIC;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT is_group_member(p_group_id, v_actor_id) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- FIX 4: Validate payer is an active group member
  IF p_paid_by_user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = p_group_id AND user_id = p_paid_by_user_id AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'Payer must be an active member of this group';
    END IF;
  END IF;

  SELECT COALESCE(SUM((s->>'share_amount')::NUMERIC), 0)
  INTO v_split_sum
  FROM jsonb_array_elements(p_splits) AS s;

  IF v_split_sum > p_amount + 0.01 THEN
    RAISE EXCEPTION 'Splits cannot exceed total';
  END IF;

  -- FIX 3: Use auth.uid() as created_by instead of client param
  INSERT INTO expenses (group_id, amount, description, paid_by_user_id, paid_by_name, created_by, is_settled, expense_type)
  VALUES (p_group_id, p_amount, p_description, p_paid_by_user_id, p_paid_by_name, v_actor_id, false, p_expense_type)
  RETURNING to_jsonb(expenses.*) INTO v_expense;

  v_expense_id := (v_expense->>'id')::UUID;

  INSERT INTO expense_splits (expense_id, user_id, member_name, share_amount)
  SELECT
    v_expense_id,
    (s->>'user_id')::UUID,
    s->>'member_name',
    (s->>'share_amount')::NUMERIC
  FROM jsonb_array_elements(p_splits) AS s;

  -- Safety net: delete payer's split row if it was included (NULL-safe)
  DELETE FROM expense_splits
  WHERE expense_id = v_expense_id
    AND (
      (p_paid_by_user_id IS NOT NULL AND user_id = p_paid_by_user_id)
      OR (p_paid_by_user_id IS NULL AND user_id IS NULL AND member_name = p_paid_by_name)
    );

  -- Auto-settle solo expenses (no splits remaining = no one owes anything)
  IF NOT EXISTS (SELECT 1 FROM expense_splits WHERE expense_id = v_expense_id) THEN
    UPDATE expenses SET is_settled = true WHERE id = v_expense_id;
    v_expense := (SELECT to_jsonb(e.*) FROM expenses e WHERE e.id = v_expense_id);
  END IF;

  SELECT array_agg(s->>'member_name' ORDER BY s->>'member_name')
  INTO v_member_names
  FROM jsonb_array_elements(p_splits) AS s
  WHERE (s->>'user_id')::UUID IS DISTINCT FROM p_paid_by_user_id;

  SELECT COALESCE(display_name, 'Unknown') INTO v_actor_name
  FROM profiles WHERE user_id = v_actor_id;

  INSERT INTO activity_log (group_id, actor_id, actor_name, action_type, expense_snapshot)
  VALUES (
    p_group_id,
    v_actor_id,
    COALESCE(v_actor_name, 'Unknown'),
    'added',
    jsonb_build_object(
      'expense_id', v_expense_id,
      'description', p_description,
      'amount', p_amount,
      'paid_by_name', p_paid_by_name,
      'member_names', to_jsonb(v_member_names),
      'expense_type', p_expense_type
    )
  );

  RETURN v_expense;
END;
$$;

-- ============================================================
-- FIX 5: Soft-deleted groups not readable
-- ============================================================
DROP POLICY IF EXISTS "Group members can view groups" ON groups;
CREATE POLICY "Group members can view groups"
ON groups FOR SELECT TO public
USING (is_group_member(id, auth.uid()) AND deleted_at IS NULL);

-- ============================================================
-- FIX 6: Only creator can update group
-- ============================================================
DROP POLICY IF EXISTS "Group members can update group" ON groups;
CREATE POLICY "Group creator can update group"
ON groups FOR UPDATE TO authenticated
USING (auth.uid() = created_by);

-- ============================================================
-- FIX 7: log_member_joined — require group membership
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_member_joined(p_group_id uuid, p_actor_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT is_group_member(p_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  INSERT INTO activity_log (group_id, actor_id, actor_name, action_type, expense_snapshot, change_detail)
  VALUES (p_group_id, auth.uid(), p_actor_name, 'joined', NULL, NULL);
END;
$$;

-- ============================================================
-- FIX 8: Sole admin leave prevention trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_sole_admin_leave()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_group_creator UUID;
  v_other_active_count INT;
BEGIN
  -- Only fire when status changes to 'left'
  IF NEW.status = 'left' AND OLD.status = 'active' AND OLD.user_id IS NOT NULL THEN
    -- Check if this user is the group creator
    SELECT created_by INTO v_group_creator
    FROM groups WHERE id = OLD.group_id;

    IF v_group_creator = OLD.user_id THEN
      -- Count other active non-placeholder members
      SELECT COUNT(*) INTO v_other_active_count
      FROM group_members
      WHERE group_id = OLD.group_id
        AND id != OLD.id
        AND status = 'active'
        AND is_placeholder = false;

      IF v_other_active_count = 0 THEN
        RAISE EXCEPTION 'Cannot leave — you are the only admin. Delete the group or add another member first.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_sole_admin_leave
BEFORE UPDATE ON group_members
FOR EACH ROW
EXECUTE FUNCTION prevent_sole_admin_leave();
