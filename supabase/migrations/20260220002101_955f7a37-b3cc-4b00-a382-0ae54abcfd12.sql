
-- Allow authenticated users to claim unclaimed placeholder members
CREATE POLICY "Authenticated users can claim placeholders"
ON group_members FOR UPDATE
USING (is_placeholder = true AND user_id IS NULL)
WITH CHECK (is_placeholder = false AND user_id = auth.uid());

-- Allow users to claim unclaimed expense splits (scoped to groups they belong to)
CREATE POLICY "Users can claim placeholder splits"
ON expense_splits FOR UPDATE
USING (
  user_id IS NULL
  AND EXISTS (
    SELECT 1 FROM expenses e
    WHERE e.id = expense_splits.expense_id
    AND is_group_member(e.group_id, auth.uid())
  )
)
WITH CHECK (user_id = auth.uid());

-- Allow users to claim unclaimed paid_by_user_id on expenses in their groups
CREATE POLICY "Users can claim placeholder expenses"
ON expenses FOR UPDATE
USING (paid_by_user_id IS NULL AND is_group_member(group_id, auth.uid()))
WITH CHECK (paid_by_user_id = auth.uid());
