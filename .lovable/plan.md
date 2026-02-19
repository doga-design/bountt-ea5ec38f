## Bountt — Phase 1: Complete Onboarding Foundation

Here's what I'll build — a pixel-perfect onboarding flow sitting on top of a rock-solid architectural foundation that makes Phase 2 seamless.

---

### 🎨 Design System
- **Color palette**: Bountt Orange (`#E8480A`), Near-black (`#1A1A1A`), Light grey background (`#EBEBEB`), White
- **Typography**: Serif-style bold for the "bountt." wordmark, clean sans-serif for body
- **Components**: Reusable Button (primary orange, dark, ghost/pill variants), Input (with validation), Card, ProgressBar, Toast, LoadingSpinner, EmptyState

---

### 📱 Screens (Pixel-Perfect from Mockups)

**Screen 0 — Splash**
- Light grey background
- "bountt." wordmark centered with orange period
- "Shared expenses made simple." tagline
- Orange hand illustration asset at bottom
- Auto-advances to Auth after 2 seconds

**Screen 1 — Auth (Sign Up / Sign In)**
- "bountt." wordmark at top
- Dark pill header "Let's get you started ↙"
- Email + Password fields (white rounded cards)
- "or" divider
- "Continue with Google" button
- Orange pill "Continue →" CTA
- "I have a group invite code →" link at bottom (routes to join flow)

**Screen 2 — Group Name & Icon**
- Orange curved header with "bountt." logo + progress dots (step 1 of 3)
- Back/Forward navigation arrows
- "Name your group 🏅" dark pill header
- "This is what everyone will see" subtext
- Text input with emoji picker icon
- Horizontal scrolling suggestion chips: "Lake House 😊", "The Condo ⭐", "Planners 🗂️", etc.
- Grey "Continue →" pill CTA at bottom

**Screen 3 — Invite Friends**
- Full orange background top half with "bountt." + progress dots
- White "Invite your friends to group 🔓" header card
- Inner card showing:
  - "YOUR BOUNTT GROUP CODE" label
  - Generated **BNTT-XXXX** code in bold
  - Share icon + external link icon buttons
  - "OR LET YOUR FRIENDS SCAN" + QR code (orange, generated from invite URL)
- Bottom section: Orange "Continue →" CTA + "Skip invite and continue →" text link

---

### 🗃️ Complete Database Schema (All Tables Created Now)

- **profiles** — display name, avatar url, linked to auth user
- **groups** — name, emoji/icon, invite_code (BNTT-XXXX), created_by, created_at
- **group_members** — group_id, user_id (nullable), name (for placeholders), is_placeholder flag, joined_at
- **expenses** — group_id, amount, description, paid_by_user_id (nullable), paid_by_name, date, is_settled, created_by, timestamps
- **expense_splits** — expense_id, user_id (nullable), member_name, share_amount
- **smart_match_dismissals** — group_id, expense_id_1, expense_id_2, dismissed_by, dismissed_at

All tables with Row Level Security (RLS) so users only see data from their groups.

---

### ⚙️ State Management (AppContext)

A single `AppContext` wrapping the whole app managing:
- `currentUser` + `session`
- `currentGroup` + `setCurrentGroup(groupId)`
- `userGroups` list + `fetchGroups()`
- `expenses` for active group + `fetchExpenses()`
- `groupMembers` for active group + `fetchMembers()`
- `loading` / `error` states
- `addExpense`, `calculateBalances` functions

Real-time Supabase subscriptions wired up for `expenses` and `group_members` (dormant but ready for Phase 2).

---

### 🛣️ Full Route Structure

- `/` → Splash (auto-redirect)
- `/auth` → Sign up / sign in
- `/onboarding/group-name` → Step 1: Name your group
- `/onboarding/invite` → Step 2: Invite friends + QR code
- `/join/:inviteCode` → Join via invite code (stubbed)
- `/dashboard/:groupId` → Main dashboard (Coming Soon placeholder)
- `/groups` → All groups list (Coming Soon placeholder)
- `/groups/:groupId/members` → Member management (Coming Soon)
- `/groups/:groupId/settings` → Group settings (Coming Soon)

---

### 🔧 Utility Functions Library

- `generateInviteCode()` → `BNTT-XXXX` format
- `formatCurrency(amount)` → `$XX.XX`
- `formatRelativeDate(date)` → "Today", "Yesterday", "Last Week"
- `calculateNetBalance(expenses, userId)` → net balance
- `validateExpenseAmount(value)` → boolean
- `detectSmartMatch(expense1, expense2)` → boolean (stubbed)
- `generateJoinUrl(inviteCode)` → full shareable URL

---

### 🔌 Backend (Lovable Cloud)

- Email/password auth + Google OAuth
- All 6 database tables with migrations
- RLS policies on all tables
- Auto-create profile trigger on signup
- QR code generation for invite screen

---

### ✅ Acceptance Criteria

1. ✅ Can sign up and create a group
2. ✅ Can generate and share invite code + QR
3. ✅ All 6 database tables exist in Supabase
4. ✅ AppContext wired to all components
5. ✅ 8+ reusable components in component library
6. ✅ Phase 2 routes exist (stubbed)
7. ✅ Full TypeScript with proper types
8. ✅ Error handling on all API calls
9. ✅ Loading states on all async operations