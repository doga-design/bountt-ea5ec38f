

# Fix: Splash Screen During Loading

## Problem

When opening the app directly to `/dashboard/:groupId`:

1. `authLoading` starts `true`, `groupsLoading` starts `false`
2. Auth resolves -- `authLoading` becomes `false`, `fetchGroups` is called
3. Brief gap before `groupsLoading` becomes `true`
4. During that gap, AuthGuard renders children, Dashboard sees empty `userGroups`, flashes the empty state
5. Groups finish loading, Dashboard re-renders correctly

## Fix (2 small changes)

### 1. `src/contexts/AppContext.tsx` -- Initialize `groupsLoading` to `true`

Change line 26 from:
```
const [groupsLoading, setGroupsLoading] = useState(false);
```
to:
```
const [groupsLoading, setGroupsLoading] = useState(true);
```

This eliminates the gap where groups appear "loaded" but are actually empty. When auth resolves with no user, we set `groupsLoading` to `false` explicitly in the sign-out branch (lines 108-113).

Also add `setGroupsLoading(false)` to the sign-out/no-user branch so it resets properly when there's no authenticated user.

### 2. `src/components/AuthGuard.tsx` -- Wait for groups too

Update AuthGuard to show the loading spinner while either `authLoading` OR `groupsLoading` is true. This ensures no protected page renders until groups data is ready.

```
const { user, authLoading, groupsLoading } = useApp();

if (authLoading || groupsLoading) {
  // show spinner
}
```

This way the splash/spinner is shown continuously from app load until both auth AND groups are resolved, preventing any intermediate screen from flashing.

## Why This Works

- No more gap between "auth done" and "groups loading started"
- AuthGuard acts as a gate: nothing renders until all critical data is ready
- The Splash page (route `/`) already handles its own loading logic and is unaffected
- Sign-out properly resets `groupsLoading` to `false`

