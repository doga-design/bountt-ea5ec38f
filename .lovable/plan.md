

# Add BottomNav to Groups Page

## What to do

Add `BottomNav` to `src/pages/Groups.tsx`. Two changes needed:

### 1. Groups.tsx — Add BottomNav at the bottom

- Import and render `<BottomNav>` at the bottom of the page, inside the `screen-container` div but outside the scrollable content div
- The `onFabPress` prop: since there's no expense creation context on the groups page, the FAB should navigate to the last-visited group's dashboard (read `bountt_last_group_id` from localStorage, or fall back to `userGroups[0].id`) and then the user can add an expense from there. Alternatively, the FAB could be a no-op — but navigating to the last group makes more sense.

### 2. BottomNav.tsx — Make Home button navigate to last-visited group

Currently the Home button's `onClick` is `() => {}` (empty). Fix it:
- Read `bountt_last_group_id` from localStorage
- If it exists, navigate to `/dashboard/${lastGroupId}`
- If not, navigate to `/dashboard/${userGroups[0]?.id}` — but BottomNav doesn't have access to `userGroups`. Instead, use `useApp()` context to get `userGroups`.
- Actually, simpler: BottomNav already knows the current dashboard path. The Home button should navigate to the last-visited group dashboard. Read from localStorage directly — no context needed since Dashboard.tsx already persists the ID.

**BottomNav changes:**
- Home `onClick`: `navigate(\`/dashboard/${localStorage.getItem("bountt_last_group_id") || ""}\`)` — if no stored ID, fall back by reading from context or just navigate to `/groups` as a safe fallback.

### Files touched
- `src/pages/Groups.tsx` — add `<BottomNav>` 
- `src/components/BottomNav.tsx` — wire Home button to navigate to last-visited group

