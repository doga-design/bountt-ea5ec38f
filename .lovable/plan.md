

# Audit & Proposed Approach for Change 1

## Root Cause Analysis

**Why arcs don't show in the numpad:**

MemberAvatarGrid's SVG draws arcs from an **apex point** (`containerWidth/2, 0`) down to each member avatar. But there is **no payer avatar at that apex** — the payer avatar is rendered separately above in `ExpenseScreen.tsx` (line 706, as `PayerAvatar`), completely outside the MemberAvatarGrid component. So the arcs start from empty space above the member row, with no visual anchor.

The SVG code itself is structurally correct — paths render, particles animate. The problem is **architectural**: the payer avatar and the member avatars live in different components with no spatial relationship. The arcs connect to a calculated point that doesn't correspond to any visible element.

**Can it be fixed with a small targeted change?**

No. The fundamental issue is that MemberAvatarGrid doesn't render a payer avatar, so there's nothing for the arcs to connect to. Adding a payer avatar to MemberAvatarGrid would fix it, but that means MemberAvatarGrid becomes essentially the same component as ExpenseSpokeViz — payer at top, members below, arcs between.

## Proposed Approach: Enhance MemberAvatarGrid into a Self-Contained Component

Rather than layering two components or duplicating code, **add the payer avatar directly into MemberAvatarGrid** as an optional feature:

1. Add new optional props to MemberAvatarGrid: `payerMember?: GroupMember` and `payerOnClick?: () => void`
2. When `payerMember` is provided, render the payer avatar centered at the top of the component (same styling as ExpenseSpokeViz — 64px, colored border, white shadow)
3. The SVG arcs connect from the payer avatar's center to each active member avatar's center — using the same `getBoundingClientRect` measurement approach that ExpenseSpokeViz uses (not the current slot-width calculation which doesn't account for actual avatar positions)
4. Particle animation identical to ExpenseSpokeViz: dashed paths, animated circles traveling bottom→top, opacity fade
5. Member row stays exactly as-is: toggleable avatars with active/inactive states, names, split amounts, add button
6. In ExpenseScreen.tsx, remove the separate `PayerAvatar` from slide 2 and pass `payerMember` to MemberAvatarGrid instead

**This gives exactly**: payer at top center → dashed arc lines → selected member avatars below → particles animating bottom→top. Single component, no duplicates, no layering.

The measurement approach switches from slot-width math to `getBoundingClientRect` (matching ExpenseSpokeViz), which correctly handles varying avatar sizes, gaps, and centering. This is the reason ExpenseSpokeViz works perfectly and MemberAvatarGrid's arcs look wrong even when they render.

**Files changed:**
- `MemberAvatarGrid.tsx` — add payer avatar rendering, switch to getBoundingClientRect measurement for arc endpoints
- `ExpenseScreen.tsx` — remove standalone PayerAvatar from slide 2, pass `payerMember` prop to MemberAvatarGrid

---

# Changes 2–4 (Unchanged from approved plan)

## Change 2 — Remove colored bold names, "You" bold black only
Same as approved. ~10 files, remove all color styling on names, keep only `font-bold` on "You" text with default foreground color.

## Change 3 — Hero bg on FAB, dark tint, BringBoldNineties on +/-
Same as approved. BottomNav gets background image on FAB + font-bringbold on "+". HeroCarousel gets `bg-black/35` overlay. NetBalanceSlide gets font-bringbold on +/- prefix.

## Change 4 — Bottom navbar z-[9999]
Same as approved. Add `z-[9999]` to BottomNav fixed container.

