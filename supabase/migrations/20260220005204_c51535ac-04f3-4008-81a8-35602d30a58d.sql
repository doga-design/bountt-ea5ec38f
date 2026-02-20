CREATE POLICY "Anyone can view placeholders for claiming"
ON group_members FOR SELECT
TO authenticated
USING (is_placeholder = true AND user_id IS NULL);