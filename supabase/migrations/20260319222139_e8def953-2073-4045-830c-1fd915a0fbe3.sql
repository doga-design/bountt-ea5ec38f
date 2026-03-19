
-- Part C: Backfill NULL avatar_index values (before adding constraint)
DO $$
DECLARE
  r RECORD;
  v_used INT[];
  v_candidate INT;
BEGIN
  FOR r IN
    SELECT id, group_id
    FROM group_members
    WHERE avatar_index IS NULL AND status = 'active'
    ORDER BY group_id, joined_at
  LOOP
    -- Get currently used indices for this group
    SELECT array_agg(avatar_index)
    INTO v_used
    FROM group_members
    WHERE group_id = r.group_id
      AND status = 'active'
      AND avatar_index IS NOT NULL;

    v_used := COALESCE(v_used, ARRAY[]::INT[]);

    -- Find first available index 1-6
    v_candidate := NULL;
    FOR i IN 1..6 LOOP
      IF NOT (i = ANY(v_used)) THEN
        v_candidate := i;
        EXIT;
      END IF;
    END LOOP;

    IF v_candidate IS NOT NULL THEN
      UPDATE group_members SET avatar_index = v_candidate WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

-- Part A: Clean up any existing duplicates (keep lowest id)
DELETE FROM group_members a
USING group_members b
WHERE a.group_id = b.group_id
  AND a.avatar_index = b.avatar_index
  AND a.status = 'active'
  AND b.status = 'active'
  AND a.avatar_index IS NOT NULL
  AND a.id > b.id;

-- Add unique partial index
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_avatar_index_per_group
ON group_members (group_id, avatar_index)
WHERE status = 'active' AND avatar_index IS NOT NULL;

-- Part B: Drop old 3-param RPC overloads that don't set avatar_index
DROP FUNCTION IF EXISTS public.join_group(uuid, text, text);
DROP FUNCTION IF EXISTS public.add_placeholder_member(uuid, text, text);
DROP FUNCTION IF EXISTS public.create_group_with_creator(text, text, text, text, text);
