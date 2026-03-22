

## Fix: Add Profile Icon to HeroCarousel.tsx

**Problem:** Profile icon was added to `DashboardHeader.tsx` but in normal mode (active group with expenses), Dashboard renders `HeroCarousel.tsx` instead. The profile icon never appears during normal use.

**One file changed:** `src/components/dashboard/HeroCarousel.tsx`

### Change 1 — Import CircleUser (line 3)
```tsx
// Before
import { Settings } from "lucide-react";

// After
import { Settings, CircleUser } from "lucide-react";
```

### Change 2 — Replace single Settings button with Profile + Settings group (lines 90-96)
```tsx
// Before
          <button
            className="w-10 h-10 flex items-center justify-center rounded-full"
            aria-label="Group settings"
            onClick={() => navigate(`/groups/${currentGroup.id}/settings`)}
          >
            <Settings className="w-5 h-5 text-white" />
          </button>

// After
          <div className="flex items-center gap-1.5">
            <button
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 backdrop-blur-sm"
              aria-label="Profile"
              onClick={() => navigate("/profile")}
            >
              <CircleUser className="w-5 h-5 text-white" />
            </button>
            <button
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 backdrop-blur-sm"
              aria-label="Group settings"
              onClick={() => navigate(`/groups/${currentGroup.id}/settings`)}
            >
              <Settings className="w-5 h-5 text-white" />
            </button>
          </div>
```

No other files changed. `useNavigate` is already imported at line 4. `DashboardHeader.tsx` keeps its existing profile button for empty/prompt states.

