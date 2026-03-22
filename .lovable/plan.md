

## Fix: Make Profile Icon Visible in Dashboard Header

The `CircleUser` icon exists in the code (line 81) at `w-5 h-5` (20px) with `text-primary-foreground`. It should be visible against the banner gradient, but it may be too small or blending with the background on certain gradients.

### Changes

**`src/components/dashboard/DashboardHeader.tsx`**
- Increase `CircleUser` icon size from `w-5 h-5` to `w-6 h-6` (matching a more tappable/visible size)
- Add a subtle background to the profile button (`bg-white/15 backdrop-blur-sm`) so it stands out against any gradient, consistent with how action buttons typically appear on photo/gradient backgrounds
- Match the same treatment to the Settings button for visual consistency

