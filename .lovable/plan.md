

# Plan: Six Targeted Changes

## Change 1 — SVG Icons White + Icon/Wallpaper Picker in Settings

**White icons**: Apply `style={{ filter: 'brightness(0) invert(1)' }}` to all `<img>` tags rendering group icons in:
- `HeroCarousel.tsx` (line 89)
- `GroupBanner.tsx` (line 45)

Do NOT apply to Groups.tsx cards or DashboardHeader.tsx — those will get background images (Change 5) and the icon treatment should match their context.

**Icon picker + Wallpaper picker in GroupBanner.tsx**:
- Replace the single `GradientPicker` dialog with a combined customization dialog containing two sections:
  1. **Icon picker**: 10 SVG icons in a grid (2 rows of 5). Tapping selects. Selected icon has a border highlight. Saves to `groups.emoji`.
  2. **Wallpaper picker**: 5 background image thumbnails + 1 cosmetic "+" slot (Change 5 details). Tapping selects. Saves to `banner_gradient` column (reusing it for `"bg-01"` through `"bg-05"` keys).

**Type/context changes**:
- `src/types/index.ts`: Update `updateGroup` type to include `emoji` in the allowed Partial: `Partial<Pick<Group, 'name' | 'banner_gradient' | 'emoji'>>`
- `src/contexts/AppContext.tsx`: Same update to `updateGroup` signature (line 385)

**Delete** `src/components/group-settings/GradientPicker.tsx` — no longer needed.

---

## Change 2 — Confetti Triggers

**Analysis of current state**:

1. **First expense confetti** — `ExpenseScreen.tsx` line 561-567. Fires when `isFirstExpense` is true. `isFirstExpense` is passed from `Dashboard.tsx` line 260 as `mode === "prompt"`. This fires _inside_ the save handler _before_ `onOpenChange(false)`, so the confetti fires while the drawer is still open. This should work but fires behind the drawer overlay.

2. **Settlement confetti** — `Dashboard.tsx` lines 62-85. `pendingConfettiRef` is set by `handleSettlementComplete` callback, which is passed to `ExpenseDetailSheet` as `onSettled`. Inside `ExpenseDetailSheet.tsx` lines 83-93, the auto-close effect calls `onSettled?.()` then `onOpenChange(false)`. The `handleDetailOpenChange` in Dashboard fires confetti when drawer closes with pending flag. This chain looks correct.

**Fix for first expense**: Move confetti from inside ExpenseScreen's save handler to Dashboard.tsx. Add a `pendingFirstExpenseConfettiRef` in Dashboard. Set it when `isFirstExpense` and the expense screen closes. Fire confetti in `onOpenChange` handler for ExpenseScreen after the drawer closes — same pattern as settlement confetti.

**Fix for settlement**: The current chain looks correct architecturally. Verify the `onSettled` prop is connected. Looking at code — `ExpenseDetailSheet` line 88 calls `onSettled?.()` and then line 89 calls `onOpenChange(false)`. But `handleDetailOpenChange` in Dashboard line 67 checks `pendingConfettiRef` only when `!open`. The issue: `onSettled()` sets `pendingConfettiRef.current = true`, then `onOpenChange(false)` triggers `handleDetailOpenChange` which reads it. This should work. If it's broken, it may be because the `onSettled` callback fires _and then_ `onOpenChange(false)` fires in the same tick via `setTimeout` — verify the timing is correct. Add a small delay if needed.

---

## Change 3.1 — Hero Less Tall + Remove Header BG Tint

**Hero height**: In `NetBalanceSlide.tsx`, `AgingDebtSlide.tsx`, `ContributionSlide.tsx` — change `min-h-[200px]` to `min-h-[150px]`. Reduce `py-4` to `py-2` on each slide.

**Remove header tint**: In `HeroCarousel.tsx` line 85 — delete `<div className="absolute inset-0 bg-black/10" />`. The nav bar row becomes fully transparent over the background image.

---

## Change 3.2 — BringBoldNineties Font

**Copy font**: `user-uploads://Bringbold_Nineties_Regular.ttf` → `src/assets/fonts/Bringbold_Nineties_Regular.ttf`

**Add @font-face** in `src/index.css`:
```css
@font-face {
  font-family: 'BringBoldNineties';
  src: url('@/assets/fonts/Bringbold_Nineties_Regular.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}
```

Add utility class `.font-bringbold { font-family: 'BringBoldNineties', sans-serif; }` in the utilities layer.

**Apply**: In `NetBalanceSlide.tsx` line 137, the `<span>` for `displayAmount` — add `font-bringbold` class. Only this element. The badge/label above uses default font.

---

## Change 4 — Restore MemberAvatarGrid Animation

**Root cause**: The parent wrapper in `ExpenseScreen.tsx` line 744 uses `style={{ width: 'fit-content' }}`. This constrains the MemberAvatarGrid container, but the ResizeObserver should still measure it. However, the SVG `overflow: "visible"` combined with the `fit-content` parent may cause clipping.

**Investigation + fix approach**:
- Remove `width: 'fit-content'` from the parent wrapper in ExpenseScreen line 744. Instead use `width: '100%'` or remove the style entirely — let the MemberAvatarGrid fill available width naturally.
- Verify the SVG renders at `position: absolute, top: 0, left: 0, width: 100%, height: SVG_HEIGHT` with `overflow: visible` and `pointerEvents: none`.
- Confirm `activeIds` is passed correctly and members with IDs in the set show lines.

The parent div structure becomes:
```jsx
<div className="flex justify-center">
  <MemberAvatarGrid ... />
</div>
```
Remove the intermediate `<div className="relative" style={{ width: 'fit-content' }}>`.

---

## Change 5 — Replace Gradients with 5 Background Images

**Copy assets**: 
- `user-uploads://bg-01.webp` → `src/assets/backgrounds/bg-01.webp`
- `user-uploads://bg-02.webp` → `src/assets/backgrounds/bg-02.webp`
- `user-uploads://bg-03.webp` → `src/assets/backgrounds/bg-03.webp`
- `user-uploads://bg-04.webp` → `src/assets/backgrounds/bg-04.webp`
- `user-uploads://bg-05.webp` → `src/assets/backgrounds/bg-05.webp`

**Create utility** `src/lib/background-utils.ts`:
- Import all 5 images
- Map `"bg-01"` through `"bg-05"` to imports
- Export `getBackgroundSrc(key: string): string` — returns image URL, fallback to `bg-02` (orange) for unknown/legacy gradient keys
- Export `BACKGROUND_IDS` array

**Replace GRADIENTS everywhere**:
- `HeroCarousel.tsx`: Delete `GRADIENTS` map. Use `getBackgroundSrc(currentGroup.banner_gradient)` → `style={{ backgroundImage: url(...), backgroundSize: 'cover', backgroundPosition: 'center' }}`
- `DashboardHeader.tsx`: Same replacement
- `GroupBanner.tsx`: Same replacement  
- `Groups.tsx`: Same replacement for group cards

**Default mapping**: Any `banner_gradient` value not in `"bg-01"`..`"bg-05"` falls back to `"bg-02"` (orange bg, closest to the original orange gradient).

**Sixth slot** in the wallpaper picker (GroupBanner customization dialog): After the 5 thumbnail buttons, add a `<div>` with `border: 1.5px dashed`, muted border color, centered `+` text. No onClick, no functionality. Purely cosmetic.

---

## Files Changed Summary

| File | Action |
|------|--------|
| `src/assets/backgrounds/bg-01..05.webp` | Create (copy from uploads) |
| `src/assets/fonts/Bringbold_Nineties_Regular.ttf` | Create (copy from upload) |
| `src/lib/background-utils.ts` | Create |
| `src/index.css` | Add font-face + utility class |
| `src/components/dashboard/HeroCarousel.tsx` | Remove gradients, use bg images, remove header tint, white icon filter |
| `src/components/dashboard/slides/NetBalanceSlide.tsx` | Reduce height, apply BringBoldNineties to balance number |
| `src/components/dashboard/slides/AgingDebtSlide.tsx` | Reduce height |
| `src/components/dashboard/slides/ContributionSlide.tsx` | Reduce height |
| `src/components/dashboard/slides/useHeroData.ts` | No change |
| `src/components/dashboard/DashboardHeader.tsx` | Remove gradients, use bg images |
| `src/components/group-settings/GroupBanner.tsx` | Replace gradient with bg image, add combined icon+wallpaper picker |
| `src/components/group-settings/GradientPicker.tsx` | Delete |
| `src/pages/Groups.tsx` | Replace gradients with bg images |
| `src/pages/Dashboard.tsx` | Fix first-expense confetti trigger |
| `src/components/expense/ExpenseScreen.tsx` | Remove confetti from save handler, fix MemberAvatarGrid wrapper |
| `src/components/dashboard/ExpenseDetailSheet.tsx` | Verify settlement confetti path |
| `src/types/index.ts` | Add `emoji` to updateGroup type |
| `src/contexts/AppContext.tsx` | Add `emoji` to updateGroup signature |

## Files NOT Changed

Auth, avatar system, RPCs, RLS policies, realtime subscriptions, settlement logic, ExpenseSheet.tsx.

