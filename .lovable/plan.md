

## Complete Audit: User and Profile Management

---

### PART 1 — WHAT EXISTS TODAY

**1. Does /profile route exist in App.tsx?**
No. `src/App.tsx` has no `/profile` route anywhere in its Routes block (lines 38-65).

**2. Does src/pages/Profile.tsx exist?**
No. File does not exist.

**3. Profile icon in DashboardHeader.tsx?**
No. The header top row (line 34) has overlapping member avatars on the left and a single Settings gear on the right (lines 75-81). No profile icon, no tappable entry to profile settings.

**4. Profile tab in BottomNav.tsx?**
No. BottomNav has exactly 3 elements: Home button, FAB (+), All Groups button. No profile tab.

**5. signOut export and call sites?**
`signOut` is defined at AppContext.tsx line 165, exported in the value object at line 621. It is **never called from any UI component**. No button in the entire app triggers sign-out. The only sign-out that happens is the automatic one in the auth state handler (line 133) for deleted/revoked users.

**6. update_display_name RPC?**
Does not exist. No migration, no function definition anywhere.

**7. delete_my_account RPC?**
Does not exist. No migration, no function, no UI for account deletion anywhere.

**8. Profiles table columns:**
- `id` (uuid, not null, default gen_random_uuid())
- `user_id` (uuid, not null)
- `display_name` (text, nullable)
- `avatar_url` (text, nullable)
- `created_at` (timestamptz, not null, default now())
- `updated_at` (timestamptz, not null, default now())

**9. RLS on profiles:**
- SELECT: `auth.uid() = user_id` (own profile only)
- INSERT: `auth.uid() = user_id`
- UPDATE: `auth.uid() = user_id`
- No DELETE policy — users cannot delete their profile row

**10. Where profile.display_name is read in UI:**
- `AppContext.tsx` line 187: group creation fallback name
- `Join.tsx` lines 86, 154, 195: join/claim fallback name
- `ExpenseScreen.tsx` line 525: edit expense actor name
- `ExpenseDetailSheet.tsx` line 194: delete expense actor name

**11. user.email accessible?**
Yes. `user` (Supabase User object) is exposed at AppContext line 592. `user.email` is a standard property. Used as fallback at AppContext line 187, Join.tsx lines 86/154/195, etc.

**12. user.app_metadata?.provider accessible?**
Yes, via `user.app_metadata.provider`. Since email/password auth was removed (per memory), every user is a Google user. No code currently checks this.

**13. Password change flow?**
None. Zero references to "password" in any .tsx file.

**14. Account deletion flow?**
None. No UI, no RPC, no edge function. `handle_user_deletion()` trigger exists on `auth.users` BEFORE DELETE, but there's no way to invoke user deletion from the client.

**15. User avatar:**
No global user avatar. Only per-group avatars stored in `group_members.avatar_color` + `group_members.avatar_index`. The `profiles.avatar_url` column exists but is never written to or read in UI. Google's `user.user_metadata.avatar_url` is available but unused.

---

### PART 2 — APPCONTEXT USER STATE

**Auth/profile state variables:**
| Name | Type | Initial | Line |
|------|------|---------|------|
| `user` | `User \| null` | `null` | 13 |
| `session` | `Session \| null` | `null` | 14 |
| `profile` | `Profile \| null` | `null` | 15 |
| `authLoading` | `boolean` | `true` | 16 |

**updateDisplayName in AppContext?** No.

**deleteAccount in AppContext?** No.

**User-related functions exported:** Only `signOut` (line 621).

**After Google sign-in metadata:**
- `user.user_metadata.full_name` — Google display name (used by `handle_new_user` trigger to populate `profiles.display_name`)
- `user.user_metadata.avatar_url` — Google profile photo URL
- `user.email` — Google email
- `user.app_metadata.provider` — `"google"`

---

### PART 3 — GAPS AND RISKS

**Routing conflict for /profile?** None. No existing route conflicts.

**update_display_name without RPC?** Yes — current RLS allows `UPDATE` where `auth.uid() = user_id`. A direct `supabase.from("profiles").update({ display_name }).eq("user_id", uid)` works. No RPC needed.

However: changing display_name on profiles does NOT update `group_members.name` or historical `expense_splits.member_name`. Those are snapshot names. This is expected behavior but worth noting.

**delete_my_account without server function?** No. `supabase.auth.admin.deleteUser()` requires the service role key. Client-side `supabase.auth.updateUser()` cannot delete. An edge function or RPC with service role access is required.

**handle_user_deletion trigger:** Exists (attached to `auth.users` BEFORE DELETE). On deletion it: transfers group ownership to next admin or soft-deletes group, demotes the user's admin roles, marks all memberships as `left`. This is correct — but nothing currently triggers user deletion.

**Display name change propagation:** Only updates the `profiles` row. `group_members.name` is set at join time and not synced. This is acceptable — group names are independent of profile names.

**Account deletion cleanup:** `clearAllState()` (line 104-116) handles the `null` session from `onAuthStateChange`. It clears all state. This is correct.

**Null profile crash risk:** `profile` is used with optional chaining (`profile?.display_name`) everywhere. No crash risk.

**Google-only users:** Correct. Every user is Google. Password section should not exist at all.

---

### PART 4 — IMPLEMENTATION READINESS

| Feature | Exists | What exists | What needs building | Risk |
|---------|--------|-------------|---------------------|------|
| Profile page route | No | Nothing | Route in App.tsx, Profile.tsx page | None |
| Entry point from header | No | Settings gear exists | Add profile icon/avatar next to gear | Low — layout change |
| Display name view | Partial | profile.display_name in context | Render it on profile page | None |
| Display name edit | No | RLS allows update | Input + save handler in Profile.tsx | Low — direct update works |
| Email display | Partial | user.email in context | Render on profile page | None |
| Google account indicator | No | user.app_metadata.provider available | Badge/label on profile | None |
| Sign out button | Partial | signOut() in context, no UI | Button on profile page calling signOut | None |
| Delete account | No | handle_user_deletion trigger exists | Edge function + confirmation UI | **High** — needs server-side |
| Privacy policy link | No | URLs exist in Auth.tsx (bountt.app/privacy) | Link on profile page | None |
| Terms of service link | No | URL exists in Auth.tsx (bountt.app/terms) | Link on profile page | None |
| App version display | No | Nothing | Read from package.json or env | None |
| Avatar on profile | No | Google avatar_url in user_metadata, unused | Display Google photo or group avatar | Low |

---

### PART 5 — ENTRY POINT

**Current DashboardHeader layout (top row, line 34):**
- LEFT: Overlapping member avatar circles + optional "+" add-member button
- RIGHT: Settings gear icon (single button)

No profile icon exists.

**Icon library:** lucide-react. Best icon: `UserCircle` or `CircleUser` — matches the existing rounded icon style.

**Layout impact:** Minimal. The right side has a single gear button. Adding a profile avatar/icon to the left of the gear or making the current user's avatar in the row tappable would work with no structural changes.

---

### IMPLEMENTATION PLAN (ordered by dependency)

1. **Edge function: delete-account** — Must exist before profile page can offer account deletion. Creates `supabase/functions/delete-account/index.ts` that calls `supabase.auth.admin.deleteUser(uid)`. The `handle_user_deletion` trigger handles cleanup automatically.

2. **Profile page: src/pages/Profile.tsx** — Independent of everything else. Shows display name (editable), email (read-only), Google badge, sign out, delete account with confirmation, privacy/terms links, app version.

3. **Route: /profile in App.tsx** — Trivial, depends on Profile.tsx existing.

4. **Entry point: DashboardHeader.tsx** — Make the current user's avatar in the member row tappable → navigates to `/profile`. Or add a dedicated icon next to the gear.

5. **updateDisplayName in AppContext** — Optional. Could live entirely in Profile.tsx with a local handler since it only affects the profiles table. If added to context, it would update the `profile` state after save.

---

### HONEST ASSESSMENT

**Current state:** The user management system is **incomplete for production**. There is:
- No way to sign out (the function exists but no UI calls it)
- No way to view or edit profile information
- No way to delete an account
- No entry point to any user settings

**Minimum work for production-grade:**
- 1 edge function (delete-account) — ~30 lines
- 1 new page (Profile.tsx) — ~200 lines
- 1 route addition — 1 line
- 1 header entry point — ~5 lines changed
- 0 database migrations needed (RLS already allows profile updates)
- 0 new RPCs needed (direct update works for display name)

Total: ~4 files changed/created, ~240 lines of new code. The foundation (profiles table, RLS, auth trigger, clearAllState) is solid. The gap is entirely in the UI layer and the delete-account server function.

