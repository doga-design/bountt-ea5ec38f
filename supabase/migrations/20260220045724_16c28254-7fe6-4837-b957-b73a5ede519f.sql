
CREATE OR REPLACE FUNCTION public.claim_placeholder(p_placeholder_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_group_id UUID;
  v_placeholder_name TEXT;
  v_display_name TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get placeholder details and lock the row
  SELECT group_id, name INTO v_group_id, v_placeholder_name
  FROM group_members
  WHERE id = p_placeholder_id
    AND is_placeholder = true
    AND user_id IS NULL
  FOR UPDATE;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Placeholder not found or already claimed';
  END IF;

  -- Check if user is already an active member of this group
  IF EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = v_group_id AND user_id = v_user_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Already a member of this group';
  END IF;

  -- Get user's display name
  SELECT display_name INTO v_display_name
  FROM profiles
  WHERE profiles.user_id = v_user_id;

  -- Claim the placeholder
  UPDATE group_members
  SET user_id = v_user_id,
      is_placeholder = false,
      name = COALESCE(v_display_name, v_placeholder_name)
  WHERE id = p_placeholder_id;

  -- Update expense_splits for this placeholder's expenses in this group
  UPDATE expense_splits es
  SET user_id = v_user_id
  WHERE es.member_name = v_placeholder_name
    AND es.user_id IS NULL
    AND EXISTS (
      SELECT 1 FROM expenses e
      WHERE e.id = es.expense_id AND e.group_id = v_group_id
    );

  RETURN v_group_id;
END;
$$;
