# Bountt — MemberAvatarGrid + Custom Mode Fixes

## Fix 1: "+" as standalone button

**File**: `src/components/expense/MemberAvatarGrid.tsx`

- Remove the `{isLast && ...}` overlay block (lines 58-72) from inside the member map loop
- Add a new prop: `onAddMember?: () => void`
- After the `.map()`, render a standalone `<button>` in the same flex row:
  - Same `avatarSize` as the member avatars (uses the sizing tier)
  - Circular, `backgroundColor: "#EAEAE6"`, centered `Plus` icon in `color: "#888"`
  - `onClick` calls `onAddMember`
  - Has its own name label below: "Add" in muted text

**File**: `src/components/expense/ExpenseScreen.tsx`

- Import `AddMemberSheet` from `@/components/group-settings/AddMemberSheet`
- Add state: `const [showAddMember, setShowAddMember] = useState(false)`
- Pass `onAddMember={() => setShowAddMember(true)}` to `MemberAvatarGrid`
- Render `<AddMemberSheet>` with `open={showAddMember}`, wired to `addPlaceholderMember` from `useApp()` context
- After adding, refresh members and auto-select the new member in the grid (After `addPlaceholderMember` resolves successfully, add the new member's id to `activeIds` automatically so they appear selected in the grid immediately without requiring a manual tap.)

## Fix 2: Sizing tiers and centered layout

**File**: `src/components/expense/MemberAvatarGrid.tsx`

Replace the current sizing logic (lines 18-21) with a tier system based on `memberCount` (members array length, which excludes payer). The `totalSlots = memberCount + 1` (the "+" button occupies one slot).


| memberCount | Avatar | Font | Gap  | Vertical |
| ----------- | ------ | ---- | ---- | -------- |
| 2           | 100px  | 18px | 16px | 10px     |
| 3           | 92px   | 18px | 14px | 8px      |
| 4           | 75px   | 16px | 12px | 6px      |
| 5           | 60px   | 15px | 10px | 6px      |
| 6+          | 48px   | 13px | 8px  | 4px      |


Layout changes:

- Container: `justify-center` (not `items-start`), remove `overflow-x-auto` and `scrollbarWidth: none`
- Use dynamic gap from the tier table
- Remove `flex-shrink-0` from individual items — allow natural centering
- Each item width = `avatarSize`

**Dashed arc**: Add an SVG element positioned above the avatar row. It draws a dashed quadratic bezier curve from the leftmost avatar area arcing up and over to the "+" button position. Stroke: `#D4D4D4`, `stroke-dasharray="4 4"`, no fill. This sits behind the avatars using `absolute` positioning within a `relative` container.

## Fix 3: Remove duplicate total in custom mode

**File**: `src/components/expense/ExpenseScreen.tsx` (lines 607-622)

The `<AmountDisplay>` at line 609 renders on Slide 2 for BOTH equal and custom modes. In custom mode, the status pill at line 656 provides the split status. This creates two separate displays.

**Change**: Hide the AmountDisplay row when `splitMode === "custom"`:

```
{splitMode !== "custom" && (
  <div className="flex items-center justify-center gap-2 py-2 flex-shrink-0">
    <AmountDisplay amount={amount} size="medium" />
    {payerMember && <PayerAvatar ... />}
  </div>
)}
```

The status pill in the custom block (lines 656-703) remains as the only amount-related indicator. **In custom mode, hide AmountDisplay only. Keep PayerAvatar visible. The payer avatar next to the total must remain accessible in both equal and custom modes.**

## Fix 4: Redistribute excludes focused member

**File**: `src/components/expense/ExpenseScreen.tsx` (lines 213-241)

Current behavior when `remaining > 0.01`: adds the entire remaining to `focusedMemberId`. This is wrong — it should distribute to all OTHER members.

**New logic for `remaining > 0.01**`:

```
const others = splitMembers.filter(m => m.id !== focusedMemberId);
if (others.length === 0) return;
const shares = distributeCents(remaining, others.length);
others.forEach((m, i) => {
  const current = parseFloat(newAmounts.get(m.id) || "0") || 0;
  newAmounts.set(m.id, (current + shares[i]).toFixed(2));
});
```

The `remaining < -0.01` (over-budget / "Remove") branch already correctly excludes focused — no change needed there.

Edge case: if focused member is the only member, `others.length === 0`, function returns early (button does nothing).

---

## Files Modified


| File                                          | Changes                                                                                                                          |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/expense/MemberAvatarGrid.tsx` | Standalone "+" button after map, sizing tiers, centered layout, dashed arc SVG, `onAddMember` prop                               |
| `src/components/expense/ExpenseScreen.tsx`    | Add `AddMemberSheet` integration, hide AmountDisplay in custom mode on Slide 2, fix `handleDistribute` to exclude focused member |
