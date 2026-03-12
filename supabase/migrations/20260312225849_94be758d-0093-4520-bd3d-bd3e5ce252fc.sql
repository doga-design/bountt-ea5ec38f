
CREATE OR REPLACE FUNCTION public.settle_member_and_remove(p_group_id uuid, p_member_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id UUID;
  v_group_creator UUID;
  v_member_user_id UUID;
  v_member_name TEXT;
  v_is_placeholder BOOLEAN;
  v_settled_count INT := 0;
  v_settled_total NUMERIC := 0;
  v_actor_name TEXT;
  v_expense_row RECORD;
  v_all_settled BOOLEAN;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify caller is group creator
  SELECT created_by INTO v_group_creator FROM groups WHERE id = p_group_id;
  IF v_group_creator IS NULL THEN
    RAISE EXCEPTION 'Group not found';
  END IF;
  IF v_group_creator != v_caller_id THEN
    RAISE EXCEPTION 'Only the group creator can settle and remove members';
  END IF;

  -- Get member details
  SELECT user_id, name, is_placeholder INTO v_member_user_id, v_member_name, v_is_placeholder
  FROM group_members
  WHERE id = p_member_id AND group_id = p_group_id AND status = 'active';

  IF v_member_name IS NULL THEN
    RAISE EXCEPTION 'Member not found or already removed';
  END IF;

  -- Settle all unsettled splits for this member across the group
  WITH settled AS (
    UPDATE expense_splits es
    SET is_settled = true, settled_at = now()
    FROM expenses e
    WHERE es.expense_id = e.id
      AND e.group_id = p_group_id
      AND es.is_settled = false
      AND (
        (v_member_user_id IS NOT NULL AND es.user_id = v_member_user_id)
        OR
        (v_member_user_id IS NULL AND es.member_name = v_member_name AND es.user_id IS NULL)
      )
    RETURNING es.share_amount
  )
  SELECT COUNT(*), COALESCE(SUM(share_amount), 0)
  INTO v_settled_count, v_settled_total
  FROM settled;

  -- For each affected expense, check if all splits are now settled
  FOR v_expense_row IN
    SELECT DISTINCT e.id
    FROM expenses e
    INNER JOIN expense_splits es ON es.expense_id = e.id
    WHERE e.group_id = p_group_id
      AND e.is_settled = false
      AND (
        (v_member_user_id IS NOT NULL AND es.user_id = v_member_user_id)
        OR
        (v_member_user_id IS NULL AND es.member_name = v_member_name AND es.user_id IS NULL)
      )
  LOOP
    SELECT NOT EXISTS (
      SELECT 1 FROM expense_splits
      WHERE expense_id = v_expense_row.id AND is_settled = false
    ) INTO v_all_settled;

    IF v_all_settled THEN
      UPDATE expenses SET is_settled = true, updated_at = now()
      WHERE id = v_expense_row.id;
    END IF;
  END LOOP;

  -- Get actor display name
  SELECT COALESCE(display_name, 'Unknown') INTO v_actor_name
  FROM profiles WHERE user_id = v_caller_id;

  -- Write activity log entry
  IF v_settled_count > 0 THEN
    INSERT INTO activity_log (group_id, actor_id, actor_name, action_type, expense_snapshot, change_detail)
    VALUES (
      p_group_id,
      v_caller_id,
      COALESCE(v_actor_name, 'Unknown'),
      'settled',
      jsonb_build_object(
        'description', 'Settled all costs for ' || v_member_name || ' on removal',
        'amount', v_settled_total,
        'member_name', v_member_name,
        'splits_settled', v_settled_count
      ),
      jsonb_build_array(jsonb_build_object(
        'field', 'member_settled_and_removed',
        'old_value', v_member_name,
        'new_value', v_settled_count || ' splits settled ($' || to_char(v_settled_total, 'FM999999990.00') || ')'
      ))
    );
  END IF;

  -- Remove the member
  UPDATE group_members
  SET status = 'left', left_at = now()
  WHERE id = p_member_id;

  RETURN jsonb_build_object(
    'success', true,
    'splits_settled', v_settled_count,
    'total_amount', v_settled_total
  );
END;
$function$;
