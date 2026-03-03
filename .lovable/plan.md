# Multi-Spoke Dashed Arc SVG in MemberAvatarGrid

## What Changes

Replace the single dashed arc with a dynamic multi-spoke SVG where one bezier curve is drawn per member, all originating from a shared apex at center-top.

## File: `src/components/expense/MemberAvatarGrid.tsx`

### Add imports

- `useRef`, `useState`, `useEffect` from React

### Add ref and measurement logic

- Add `useRef<HTMLDivElement>` on the container div
- Add `useState<number>` for `containerWidth`, default `0`
- Add `useEffect` that measures `containerRef.current.offsetWidth` on mount and when `memberCount` changes (using `ResizeObserver` or simple measurement)

### Replace the single arc SVG (lines 34-52) with multi-spoke SVG

- SVG: `position: absolute`, `top: 0`, `left: 0`, `width: 100%`, `height: 60px`, `overflow: visible`, `pointer-events: none`
- Remove the old `totalWidth` and `arcHeight` calculations (lines 29-30)
- Set container `paddingTop` to `60px` (the SVG height) instead of `arcHeight + 4`

### Spoke calculation (only for actual members, no "+" button)

- `totalSlots = memberCount`
- `slotWidth = containerWidth / totalSlots`
- Apex: `(containerWidth / 2, 0)`
- For each member at index `i`:
  - End point: `(slotWidth * i + slotWidth / 2, 60)` (bottom of SVG = top of avatar)
  - Control point: `(endX, 0)` — this pulls each curve outward toward the avatar's X position while keeping it at the apex Y level, creating a natural downward drop from center. This matches the visual in Image 2 where each spoke fans outward from the top center point.
- Draw one `<path>` per member with `Q` bezier
- Stroke: `#D4D4D4`, `strokeDasharray="4 4"`, `strokeWidth="1.5"`, `fill="none"`
- Only render spokes when `containerWidth > 0` and `memberCount >= 2`

**For each spoke path, add an** `<animateMotion>` **child element inside the** `<path>`**:**

- A small filled circle (4px radius, color `#D4D4D4`) travels from apex to end point along the bezier path
- Use `<animateMotion>` with `repeatCount='indefinite'`
- Duration randomized per spoke: between `1.2s` and `2.4s` — derive from member index: `1.2 + (i * 0.3) % 1.2` so each spoke has a different speed
- `begin` offset also staggered: `${i * 0.4}s` so they don't all start simultaneously
- `calcMode='spline'` with `keySplines='0.4 0 0.6 1'` for ease-in-out feel
- The dot fades out near the end point: use `<animate>` on opacity, `from='1' to='0'` starting at `keyTimes='0.7'`
- The path element itself keeps `pointer-events: none` and `fill: none`
- Wrap each spoke group in a `<g>` element containing both the dashed path and the animateMotion dot

### Container div changes

- Add `ref={containerRef}` to the outer `relative` div
- Update `paddingTop` from `arcHeight + 4` to `60`

## Summary

- Single file changed: `MemberAvatarGrid.tsx`
- Adds `useRef` + `useEffect` for container width measurement
- Replaces one static arc `<path>` with N dynamic spoke `<path>` elements
- No changes to props, sizing tiers, or avatar rendering