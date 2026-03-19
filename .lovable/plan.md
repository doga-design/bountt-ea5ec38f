
Root cause confirmed from live request logs: the failing request is `PATCH /rest/v1/groups?id=eq.<groupId>` with body `{ "deleted_at": "..." }`, returning `403` with `new row violates row-level security policy for table "groups"`.

Why this still fails even after adding `WITH CHECK` on UPDATE:
- The update succeeds only if the updated row is still readable by SELECT policies during PostgREST’s internal `UPDATE ... RETURNING`.
- Your SELECT policy on `groups` requires `deleted_at IS NULL`.
- Soft delete sets `deleted_at` to a timestamp, so the updated row becomes non-readable immediately, and PostgREST raises the RLS violation.

Important clarification:
- Group management is not fully broken; this issue specifically breaks the soft-delete update path.
- Name/gradient updates should still pass because `deleted_at` remains `NULL` for those updates.

Implementation plan:
1. Add one RLS migration to adjust `groups` SELECT behavior for soft-deleted rows owned by the creator.
   - Keep current member visibility for active groups.
   - Add creator visibility for deleted rows (or fold into existing SELECT policy) so soft-delete `UPDATE ... RETURNING` can pass.
   - Recommended final SELECT condition:
     - `(is_group_member(id, auth.uid()) AND deleted_at IS NULL)`
     - `OR (auth.uid() = created_by AND deleted_at IS NOT NULL)`

2. Keep the existing UPDATE policy with explicit `WITH CHECK (auth.uid() = created_by)` (already correct).

3. Validate end-to-end after migration:
   - Retry delete from Group Settings.
   - Expect PATCH `groups` to return success (no 403).
   - Group disappears from group list because client query still filters `deleted_at IS NULL`.
   - Confirm rename/gradient/regenerate still work.

4. If needed, tighten further in a follow-up:
   - Replace client table update with a backend function for soft delete to avoid future PostgREST `RETURNING` + SELECT-policy coupling.
