
Root cause (verified in code):
- In `src/components/BottomNav.tsx`, the FAB uses a text glyph:  
  `&lt;span className="font-bringbold text-3xl leading-none"&gt;+&lt;/span&gt;`
- The container is already large (`w-16 h-16`), so touch target is fine.
- The visible `+` is small because this is a font glyph problem, not a container-size problem: the `+` character has intrinsic side bearings/ink bounds that occupy a relatively small center area, so it looks “pushed inward” even when font-size increases.

Implementation plan:
1. Update only `src/components/BottomNav.tsx` and replace the text `+` glyph with a geometric plus shape that is dimension-controlled by CSS (not font metrics).
2. Inside the FAB button, render a `relative` square wrapper (e.g. `w-9 h-9` or `w-10 h-10`), then draw:
   - one full-height vertical bar (`h-full`, fixed thickness like `w-[5px]`)
   - one full-width horizontal bar (`w-full`, fixed thickness like `h-[5px]`)
   Both bars centered absolutely, rounded, white.
3. Keep existing FAB behavior and layout unchanged:
   - same button size (`w-16 h-16`)
   - same background image/tint logic
   - same press animation and navigation callback
4. Remove no-longer-needed font dependency for this icon in FAB (`font-bringbold` not used for the plus here anymore).
5. Visual outcome target:
   - plus mark fills most of the inner icon area (near “full width/full height” perception),
   - remains optically centered,
   - clearly readable on varied hero backgrounds.

Files to change:
- `src/components/BottomNav.tsx` only.
