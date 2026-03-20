
Root cause identified (from current code in `MemberAvatarGrid.tsx`):
- The button container is already 44×44, so touch target is not the problem.
- The visible `+` is a Lucide stroke icon (`<Plus className="w-[22px] h-[22px]" />`), and Lucide’s plus path is inset inside a 24×24 viewBox with thin stroke.  
- Effective visible mark is much smaller than 22px, so it looks “pushed inward/shrunk” even when icon size is increased.

Clean fix (single-component, targeted):
1. In `src/components/expense/MemberAvatarGrid.tsx`, keep the add-member button at 44×44 (or 46×46 if needed after visual check), but replace the Lucide `<Plus>` with a text `+` glyph using `BringBoldNineties`:
   - `font-bringbold`
   - larger font size (about 30–34px)
   - `leading-none`
   - tiny vertical nudge (`-translate-y-[1px]`) for optical centering
2. Remove the hardcoded pale icon color (`#888`) and use a stronger token-based color (`text-foreground` or `text-muted-foreground`) so the mark reads heavier.
3. Keep absolute placement logic (`top: 50%`, `translateY(-50%)`, right offset) unchanged unless overlap needs minor tuning after glyph swap.
4. Do not touch other flows or logic. This is a visual/icon rendering fix only.

Why this works:
- It removes the intrinsic inset/thin-stroke behavior of Lucide that made the mark look tiny.
- The button remains tappable and visually peer-sized with nearby avatars.
- The plus shape itself becomes visibly bold and large, which is what you asked for.
