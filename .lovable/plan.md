
Assessment result:
- I verified the current source (`src/pages/Auth.tsx`) uses `<img>` rendering (not CSS mask), and in Preview all 5 floating icons render correctly.
- I also checked the Published URL and reproduced your exact issue: 4 primary-colored rectangles + 1 working icon.
- That pattern matches the old mask-based implementation (where only one SVG mask resolves correctly), so the bug is a runtime/deployment cache mismatch, not the current Auth.tsx code in preview.

Implementation plan:
1. Sync production to latest frontend build
- Publish the latest version so production gets the `<img>` icon renderer already present in code.

2. Add a one-time cache migration safeguard
- Add a startup routine to detect and unregister old service workers/caches from previous auth-icon-mask builds.
- Force a one-time reload after cleanup so users move to the new bundle.

3. Harden icon rendering against future regressions
- Keep direct `<img>` usage for all auth floating icons.
- Avoid SVG-as-mask for these assets entirely.
- (Optional) switch from CSS filter tinting to pre-tinted SVGs or `currentColor` SVGs for predictable rendering.

4. Verification checklist
- Test `/auth` in Preview and Published.
- Test normal tab + installed PWA + hard refresh scenario.
- Confirm all 5 silhouettes are visible (no rectangles) and animations still run.

Technical details:
- Root cause is likely stale PWA/service-worker-cached JS serving the previous mask-based auth icon code in production.
- Evidence: preview (latest code) renders correctly; published reproduces legacy mask failure behavior.
