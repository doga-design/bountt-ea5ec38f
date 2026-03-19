

# Fix ExpenseSpokeViz — Three Visual Fixes

## Fix 1 — SVG arcs terminate at exact avatar centers

**Problem:** SVG paths use `slotWidth * i + slotWidth / 2` to estimate member positions, but the actual avatars are in a flex row with `gap: 8` and `justify-center`, so the SVG endpoints don't align with rendered avatar centers.

**Solution:** Use refs to measure actual avatar positions relative to the container. Store an array of `{ x, y }` center coordinates via a `useCallback` ref on each member avatar wrapper. Also measure the payer avatar's center. The SVG is made `position: absolute` covering the full container so its coordinate space matches the DOM layout exactly. Paths go from payer center to each member center with a control point that creates a natural downward curve: `ctrlX = (payerCenterX + memberCenterX) / 2`, `ctrlY = payerCenterY + (memberCenterY - payerCenterY) * 0.15` — pulling the curve down from the payer.

- Add `memberPositions` state: `Record<number, { x: number; y: number }>`
- Add `payerPos` state: `{ x: number; y: number }`
- Use refs on payer div and each member avatar div, measure via `getBoundingClientRect()` relative to container's `getBoundingClientRect()` in the existing `ResizeObserver` callback + a `useLayoutEffect`
- SVG becomes `position: absolute; inset: 0; width: 100%; height: 100%` with `overflow: visible`
- Paths: `M ${payerPos.x} ${payerPos.y} Q ${ctrlX} ${ctrlY} ${memberPos.x} ${memberPos.y}`

## Fix 2 — Member avatar size scales with count

Replace the fixed `MEMBER_SIZE = 48` with a function:

```
function getMemberSize(count: number): number {
  if (count <= 1) return 72;
  if (count === 2) return 64;
  if (count === 3) return 56;
  if (count === 4) return 48;
  if (count === 5) return 44;
  return 40; // 6+
}
```

Use `getMemberSize(members.length)` for avatar width/height. Border scales proportionally: `Math.max(2, Math.round(memberSize * 3 / 48))` — roughly 3px at 48, 2px at 40.

Payer stays fixed at 64px.

## Fix 3 — Settled checkmark badge above avatar, not clipped

**Problem:** Badge is a child of the avatar div which has `overflow-hidden` (for the border-radius). It gets clipped.

**Solution:** Move the badge outside the avatar div but inside the member wrapper div. Position it absolutely, centered horizontally, above the avatar top edge. The member wrapper gets `position: relative` and the badge uses `absolute`, `left: 50%`, `transform: translateX(-50%)`, `top: -8px`, `z-index: 20`. The avatar div itself gets `grayscale` filter when settled instead of `opacity-60`. Remove `overflow-hidden` concern by keeping badge as a sibling, not a child.

## File Changed

`src/components/dashboard/ExpenseSpokeViz.tsx` — rewrite render layout with measured positions, scaled sizes, and repositioned badge.

