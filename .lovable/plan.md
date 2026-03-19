

# Update Cost Detail Bottom Sheet — Arc Visualization + Slide-to-Settle

Two visual changes to the expense detail sheet. No logic changes, no settlement changes, no RPC changes.

## Change 1 — Rewrite ExpenseSpokeViz.tsx Arc Visualization

**Current:** Straight dashed lines from payer to each member, positioned absolutely with complex trigonometry. No white ring on payer. Label text is tiny (10px). No background glow.

**New layout (matching reference):**

1. **Payer avatar** — centered at top, larger (64px), with a **white ring border** (3px solid white + box-shadow). Below it: `"You Paid · $48"` — "You Paid" in muted medium weight, amount in bold foreground. Use `·` separator.

2. **Dashed arc paths** — replace straight `<line>` elements with **quadratic Bézier `<path>` curves** (same as `MemberAvatarGrid.tsx`). Each path curves from payer center downward to each member position. Include the **animated dot (particle)** effect — exact same `<animateMotion>` + `<animate opacity>` pattern from `MemberAvatarGrid.tsx`: a small circle traveling along the path with staggered timing and fade-out. Same stroke style: `#D4D4D4`, strokeWidth 1.5, strokeDasharray `4 4`.

3. **Member avatars** — positioned in a horizontal row below the arc (not on a polar arc). Each avatar is 48px with white ring border. Below each:
   - Line 1: `"[Name]'s share"` or `"[Name] settled"` — medium weight, muted color
   - Line 2: `"· $[amount]"` — bold foreground
   - Text wraps responsively for 4-5+ members. Use `max-w-[72px]` with `text-center leading-tight break-words`.

4. **Radial background glow** — a subtle warm radial gradient behind the entire viz area. CSS: `radial-gradient(ellipse at center, rgba(232, 72, 10, 0.04) 0%, transparent 70%)` — very subtle, warm-tinted, not harsh.

5. **Layout approach** — use a simpler flex column layout:
   - Payer avatar + label at top (centered)
   - SVG overlay for curved dashed paths + animated dots
   - Member avatars in a flex row at bottom (centered, wrapping)
   - Remove all the trigonometric arc positioning code

**File:** `src/components/dashboard/ExpenseSpokeViz.tsx` — full rewrite of the render, keeping the same props interface and `canTap` logic.

## Change 2 — Slide-to-Settle Bar Styling

**Current (lines 527-552):** `bg-muted` track, `bg-foreground` thumb with `»` text character, label says "Slide to settle everyone →".

**New styling (matching reference):**

- Track: `bg-muted` (light gray) — keep as-is
- Thumb: dark navy rounded rectangle — change from `rounded-full` to `rounded-2xl`, keep `bg-foreground`. Replace `»` text with `>>` using `ChevronsRight` icon from lucide-react (or keep `»` but style it bolder)
- Label: `"Slide to settle everyone"` — remove the `→` arrow, keep muted text
- No other logic changes. Same gesture handling, same threshold, same snap-back.

**File:** `src/components/dashboard/ExpenseDetailSheet.tsx` — lines 527-552 only, minor style tweaks.

## Files Changed

- `src/components/dashboard/ExpenseSpokeViz.tsx` — rewrite visualization layout
- `src/components/dashboard/ExpenseDetailSheet.tsx` — slide-to-settle style tweaks (lines 527-552 only)

No settlement logic, no RPC, no DB changes.

