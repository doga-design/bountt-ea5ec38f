# Plan: Four Small Fixes

## FIX 1 — Add Member Button Too Small

**Current**: 36×36px, positioned absolute on right edge of member row. Plus icon 18px.(but for some weird spacing/padding whatever issue, it looks wayy too smaller, make sure u identify that first whatever is forcing btn "+" icon to be that small)

**Fix**: Increase to 44×44px with 22px icon. Adjust `right` offset to `-22` to keep alignment. This meets minimum touch target and matches the visual weight of member avatars.

**File**: `src/components/expense/MemberAvatarGrid.tsx` lines 258-273 — change width/height from 36 to 44, icon from 18 to 22, right from -18 to -22.

---

## FIX 2 — "You" Label Orange in Numpad Payer

**Current**: Line 181 in MemberAvatarGrid — payer "You" label uses `font-bold text-foreground`.

**Fix**: Change to `font-bold text-primary` to apply the brand orange color. The condition `payerMember.user_id === currentUserId` already correctly identifies when it's "You". Non-self payer names keep default color.

**File**: `src/components/expense/MemberAvatarGrid.tsx` line 181 — change `text-foreground` to `text-primary`.

---

## FIX 3 — Bottom Navbar Below Modals

**Current**: BottomNav uses `z-[9999]`. Drawers and sheets use `z-50` (z-index: 50). The navbar sits ABOVE all modals — this is wrong.

**Fix**: Change BottomNav from `z-[9999]` to `z-40`. This keeps it above regular page content (which has no explicit z-index) but below all drawers/sheets/overlays at z-50.

**File**: `src/components/BottomNav.tsx` line 20 — change `z-[9999]` to `z-40`.

---

## FIX 4 — Bottom Navbar on EmptyGroups Page

**Current**: EmptyGroups renders no BottomNav.

**Fix**: Import and render BottomNav at the bottom of EmptyGroups. The `onFabPress` handler navigates to `/onboarding/group-name` (same as the "Create New Group" button). Add bottom padding to prevent content from being hidden behind the navbar.

**File**: `src/pages/EmptyGroups.tsx` — import BottomNav, render it, add `pb-24` to main container.

---

## Files Changed


| File                   | Change                                                                        |
| ---------------------- | ----------------------------------------------------------------------------- |
| `MemberAvatarGrid.tsx` | Enlarge add button to 44×44, icon to 22px; "You" payer label → `text-primary` |
| `BottomNav.tsx`        | `z-[9999]` → `z-40`                                                           |
| `EmptyGroups.tsx`      | Add BottomNav at bottom                                                       |
