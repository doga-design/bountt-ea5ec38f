# Move "+" Button Inside MemberAvatarGrid

## Problem

Using a fixed `top` pixel value is fragile -- it only works for one avatar size tier. The button needs to be vertically centered on the avatar row regardless of tier or SVG height.

## Solution

Move the "+" button into `MemberAvatarGrid.tsx`, positioned inside the avatar row `div` with `top: 50%; transform: translateY(-50%)` so it always centers on the avatars.

## Changes

### 1. `src/components/expense/MemberAvatarGrid.tsx`

- Add optional prop `onAddMember?: () => void`
- Make the avatar row div `position: relative`
- When `onAddMember` is provided, render the "+" button inside the avatar row div with:
  ```
  position: absolute, right: -18px, top: 50%, transform: translateY(-50%), zIndex: 10
  ```
  The `position: relative` must be on the same div that contains the avatar map — the inner avatar row div. Not the outer container div that holds the SVG and the avatar row together. If `relative` is on the wrong parent, `top: 50%` will reference the full component height including the SVG, and the button will be misaligned again.  

- Import `Plus` from lucide-react

### 2. `src/components/expense/ExpenseScreen.tsx`

- Remove the standalone `<button>` for "+" from the `splitMode === "equal"` block
- Pass `onAddMember={() => setShowAddMember(true)}` to `MemberAvatarGrid`
- Keep the outer `flex justify-center` and inner `relative` + `width: fit-content` wrapper (needed so the button doesn't escape to screen edge)

### Result

```text
ExpenseScreen.tsx:
  <div className="flex justify-center">
    <div className="relative" style={{ width: 'fit-content' }}>
      <MemberAvatarGrid
        members={gridMembers}
        activeIds={activeIds}
        onToggle={handleToggleGridMember}
        currentUserId={user?.id}
        onAddMember={() => setShowAddMember(true)}
      />
    </div>
  </div>

MemberAvatarGrid.tsx (avatar row div):
  <div
    className="flex justify-center relative"
    style={{ gap, paddingTop: verticalSpacing, paddingBottom: verticalSpacing }}
  >
    {members.map(...)}
    {onAddMember && (
      <button
        onClick={onAddMember}
        className="absolute flex items-center justify-center rounded-full"
        style={{
          width: 36, height: 36,
          top: '50%', right: -18,
          transform: 'translateY(-50%)',
          zIndex: 10,
          backgroundColor: 'white',
          border: '1.5px solid #E2E2DE',
          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
        }}
        aria-label="Add member"
      >
        <Plus className="w-[18px] h-[18px]" style={{ color: '#888' }} />
      </button>
    )}
  </div>
```

Two files, clean separation. The button always centers on the avatar row via CSS, no pixel guessing.