## Security Hardening — 5 Fixes

### Files touched

- `src/contexts/AppContext.tsx` (Fix 1)
- `src/components/AuthGuard.tsx` (Fix 5)
- `src/types/index.ts` (Fix 5 — add `isVerified` to context type)
- 3 database migrations (Fixes 2, 3, 4)

After every migration runs, explicitly confirm whether it succeeded or failed. Do not assume success. For the `on_auth_user_deleted` trigger specifically, after the migration runs, query `pg_trigger` to verify the trigger is actually attached: `SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_deleted'` — show the result before proceeding to the next fix.

---

### FIX 1 — Mid-session periodic verification (AppContext.tsx)

Inside the auth `useEffect` (line 102), after registering `onAuthStateChange`, add:

- Extract the `getUser()` + cleanup logic into a named `verifySession()` function
- Set a 10-minute `setInterval` that calls `verifySession()` only if `user` is set
- Also call `verifySession()` on `visibilitychange` when document becomes visible (app resume from background)
- Clean up interval and visibility listener in the effect return
- Add `isVerified` state: starts `false`, set `true` on successful verification, reset `false` on SIGNED_OUT and on verify failure

### FIX 2 — Attach missing DB triggers (Migration)

Two triggers are confirmed missing:

`**trg_prevent_sole_admin_leave**`: Function `prevent_sole_admin_leave()` exists but was never attached. Create trigger:

```sql
DROP TRIGGER IF EXISTS trg_prevent_sole_admin_leave ON public.group_members;
CREATE TRIGGER trg_prevent_sole_admin_leave
  BEFORE UPDATE ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.prevent_sole_admin_leave();
```

`**on_auth_user_deleted**`: Function `handle_user_deletion()` exists but was never attached to `auth.users`. Create trigger:

```sql
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_deletion();
```

Note: `trg_enforce_member_limit` IS already attached (confirmed in migration `20260319161223`).

### FIX 3 — Orphaned groups on creator deletion (Migration)

**Part A — New RPC `transfer_group_ownership`:**

- Parameters: `p_group_id uuid`, `p_new_owner_id uuid`
- Verify caller is current `created_by`
- Verify new owner is active non-placeholder member
- Update `groups.created_by`, update roles, write activity log
- `SECURITY DEFINER`

**Part B — Enhance `handle_user_deletion` trigger:**
After marking memberships as `left`, for each group where `created_by = OLD.id`:

- Find oldest active non-placeholder member (by `joined_at`)
- If found: transfer `created_by` and set their role to `admin`
- If none found: soft-delete group (`deleted_at = now()`)

This prevents orphaned groups entirely.

### FIX 4 — Unsettleable expenses when payer deleted (Migration)

Modify `settle_all` and `settle_member_share` RPCs:

- After the existing payer check fails (`paid_by_user_id != auth.uid()`), add fallback:
- If `paid_by_user_id IS NULL` OR payer no longer exists in `auth.users`, allow the group creator to call these RPCs
- Check: `EXISTS (SELECT 1 FROM groups WHERE id = v_expense.group_id AND created_by = v_actor_id)`
- All existing authorization for active payers is unchanged

### FIX 5 — isVerified gates AuthGuard (AuthGuard.tsx + types)

- Add `isVerified` to `AppContextValue` interface in `types/index.ts`
- Export `isVerified` from AppContext value object
- AuthGuard checks `!isVerified` alongside `authLoading` — shows spinner until verified
- Protected content never renders until server-side verification completes

**Fix 2 —** `on_auth_user_deleted` **trigger on** `auth.users`

This is the most risky part of the plan. Creating triggers on `auth.users` requires elevated permissions that may not be available through normal migrations in Supabase. The `auth` schema is managed by Supabase internally. If this migration fails silently, the trigger never attaches and you won't know. Tell Lovable to wrap this in a `DO $$ BEGIN ... EXCEPTION WHEN OTHERS THEN NULL; END $$` block and log the result, so you know whether it succeeded or failed.

**Fix 3 —** `handle_user_deletion` **enhancement**

The current trigger only does one thing — mark memberships as left. You're now asking it to also find next owners, transfer ownership, and soft-delete groups. This is significantly more logic inside a trigger that fires on `auth.users` DELETE. If this trigger fails for any reason, the entire user deletion could fail or behave unexpectedly. Make sure Lovable wraps the new logic in its own `BEGIN ... EXCEPTION WHEN OTHERS THEN NULL; END` block so a failure in the ownership transfer doesn't block the membership cleanup.

**Fix 4 — Fallback payer authorization**

The fallback check `EXISTS (SELECT 1 FROM groups WHERE id = v_expense.group_id AND created_by = v_actor_id)` is correct. Just confirm this check is added as an OR condition alongside the existing payer check — not replacing it. The existing payer authorization must remain completely unchanged for all normal cases.

**Fix 5 —** `isVerified` **and the 10-minute interval**

The interval calls `verifySession()` only if `user` is set. Make sure the interval check reads from a ref not from state — state closures inside `setInterval` go stale in React. If it reads from state directly, it will always see the initial value of `user` (null) and never fire. Use `userRef.current` or equivalent.

---

### What stays the same

All expense creation, group creation, split logic, UI components (except AuthGuard spinner condition), routing structure — untouched.

### Verification checklist

- Deleted user opens app → `getUser()` fails → redirected to `/auth`
- Deleted user has app open → caught within 10 minutes by interval
- App resumes from background → `visibilitychange` triggers re-verification
- Creator account deleted → group auto-transfers to next member or soft-deletes
- Payer account deleted → group creator can settle their expenses
- `trg_prevent_sole_admin_leave` and `on_auth_user_deleted` triggers confirmed active
- All existing functionality works identically