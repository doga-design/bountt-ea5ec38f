

# Universal Placeholder Merge on Join

## Overview

Replace the current placeholder-specific invite link approach with a universal flow: every time someone joins a group, if that group has placeholders, show a selection dialog asking "Are you one of these people?" before adding them.

## What Changes

### 1. New Component: `PlaceholderSelectDialog`

Create `src/components/join/PlaceholderSelectDialog.tsx`

A modal dialog that:
- Receives an array of placeholder members and their expense summaries
- Shows each placeholder as a selectable card (name, ghost icon, total shared expenses)
- Includes a "None of these -- I'm someone new" option
- Has a "Continue" button (disabled until selection is made)
- Returns either the selected placeholder's ID or `null` (for new member)

### 2. Rewrite `src/pages/Join.tsx`

Replace the current single-step form submission with a multi-step flow:

**Step 1 (unchanged):** User enters/has invite code, clicks "Join Group"

**Step 2 (new):** After validating the code and checking the user isn't already a member:
- Fetch all placeholders for this group (`is_placeholder = true AND user_id IS NULL`)
- If placeholders exist, show `PlaceholderSelectDialog`
- If no placeholders, skip directly to joining as new member

**Step 3 (branched):**
- If user selected a placeholder: call `claim_placeholder` RPC (the existing SECURITY DEFINER function that atomically merges the placeholder)
- If user selected "None of these": INSERT new `group_member` as before

Key state additions:
- `placeholders`: array of placeholder members fetched from DB
- `showPlaceholderDialog`: boolean to control dialog visibility
- `pendingGroup`: the group object stored between steps
- Remove `placeholderId` from URL search params (no longer needed)

### 3. Simplify `MemberDetailSheet.tsx`

The "Invite to Bountt" button currently generates a placeholder-specific URL with `?placeholder=ID`. Change it to copy the plain group invite link without the placeholder param, since the merge is now handled by the dialog. Update the toast message accordingly.

### 4. Remove `?placeholder` URL Handling

- Remove `useSearchParams` and `placeholderId` logic from `Join.tsx`
- The `AuthGuard.tsx` fix from the previous change remains valid (preserving search params is still good practice) but is no longer critical for this flow

### 5. Use Existing `claim_placeholder` RPC

The database already has the `claim_placeholder` function that:
- Validates authentication
- Locks the placeholder row
- Checks user isn't already an active member
- Updates `group_members` (sets user_id, is_placeholder=false)
- Updates all related `expense_splits`
- Returns the group_id

Call it via: `supabase.rpc('claim_placeholder', { p_placeholder_id: selectedId })`

No database changes needed.

## Technical Details

### PlaceholderSelectDialog Props
```text
interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  placeholders: Array<{
    id: string
    name: string
    totalExpenses: number
  }>
  onSelect: (placeholderId: string | null) => void
  loading: boolean
}
```

### Join.tsx Flow (pseudocode)
```text
handleJoin():
  1. Validate code, find group
  2. Check if already a member
  3. Check if previously left (rejoin)
  4. Fetch placeholders for this group
  5. If placeholders.length > 0:
       -> store group, show dialog, return
     Else:
       -> insert as new member

handlePlaceholderSelection(id | null):
  If id:
    -> call claim_placeholder RPC
  Else:
    -> insert as new member
  fetchGroups(), navigate to dashboard
```

### Computing Expense Totals for Dialog

To show "Has $X in shared expenses" for each placeholder, query `expense_splits` joined with `expenses` where `member_name` matches the placeholder name and `user_id IS NULL`, summing `share_amount`. This query runs client-side after fetching placeholders.

## Files Changed

| File | Action |
|------|--------|
| `src/components/join/PlaceholderSelectDialog.tsx` | Create (new dialog component) |
| `src/pages/Join.tsx` | Rewrite join flow with placeholder detection |
| `src/components/group-settings/MemberDetailSheet.tsx` | Simplify invite link (remove `?placeholder` param) |

## No Database Changes Required

The existing `claim_placeholder` RPC handles all merge logic atomically. Existing RLS policies already support placeholder claiming.

