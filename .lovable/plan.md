

# Audit Results: Avatar Filter Row

## What Works Correctly
- Selection state uses `member.id` consistently — no ID mismatch between MemberAvatarRow and Dashboard
- Dashboard filter logic at lines 123-141 correctly handles both real users and placeholders (name-based fallback for null user_id)
- `expenseSplits` is populated when filter runs
- Stroke color correctly uses `getAvatarColor(member).stroke`
- Current user is sorted first and labeled "You"
- Filtered results flow correctly into the rendered feed

## What Is Broken

| # | Bug | File | Line | Root Cause |
|---|-----|------|------|------------|
| 1 | **Placeholder members cannot be filtered** | `MemberAvatarRow.tsx` | 52-54 | `if (member.is_placeholder) { return; }` exits before the filter toggle code. Placeholders only show the invite card — `onFilterMember` is never called for them. |
| 2 | **No visual muting on non-selected avatars** | `MemberAvatarRow.tsx` | 98-101 | When an avatar is selected, all other avatars remain at full opacity. There is no dim/fade applied to unselected members. |

## Minimal Fix (2 changes, same file)

**Fix 1** — `MemberAvatarRow.tsx` lines 51-65: Remove the early return for placeholders. Let all members (placeholder or real) flow into the same selection toggle logic. Optionally keep the invite card as a secondary behavior (show invite card AND filter simultaneously).

**Fix 2** — `MemberAvatarRow.tsx` line 98 `<button>` element: Add `opacity: selectedMemberId && !isSelected ? 0.4 : 1` so non-selected avatars fade when a filter is active.

No other files need changes. The Dashboard filter logic and stroke rendering are already correct.

