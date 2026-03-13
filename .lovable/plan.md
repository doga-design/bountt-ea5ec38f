# Implementation Plan: 5 Changes to Expense Screen

## Audit Summary


| Question                | Answer                                                                    |
| ----------------------- | ------------------------------------------------------------------------- |
| Sheet background        | `bg-card` (white) on line 533 of ExpenseScreen.tsx                        |
| Description input       | Does NOT exist — hardcoded `"Quick Expense"` at line 463                  |
| Particle effect         | MemberAvatarGrid.tsx lines 85-103, SVG animateMotion, runs on ALL members |
| Dotted lines            | Drawn to ALL members, not filtered by selection                           |
| Per-member split amount | NOT displayed below avatars                                               |
| Live split reactivity   | Shares computed but never shown per-member in equal mode                  |
| Camera button           | Does not exist                                                            |


---

## Change 1 — Sheet background to #EFEFEF

**File:** `src/components/expense/ExpenseScreen.tsx` line 533  
**Change:** Replace `bg-card` with inline style `backgroundColor: '#EFEFEF'` on the drawer container div. Only this element changes — all child inputs, cards, buttons keep their existing backgrounds.

---

## Change 2 — Cost name input above save button

**File:** `src/components/expense/ExpenseScreen.tsx`  

Add a `description` state variable (line ~39). Add a text input above the "Add shared expense" / "Log cost" SaveButton on Slide 2 (before line 743). Specs:

- White background, 1px `#D4D4D4` border, rounded-xl, full width, comfortable padding
- Placeholder: `What is it? (e.g Ski Pass)` with "What is it?" portion bold — implement as a single input with the placeholder styled via the `placeholder:` CSS pseudo-class (bold prefix not achievable in pure placeholder, so render as a styled single input matching the reference image)
- Wire to `description` state, max 50 chars
- Replace hardcoded `"Quick Expense"` at lines 463 and 480 with `description.trim() || "Quick Expense"`
- Reset `description` to `""` when drawer opens (in the useEffect at line 69)

Also add same input on Slide 1, between the "I am covering" text and the "Log cost" button (matching reference image position). Both inputs share the same `description` state so edits on either slide persist.

---

## Change 3 — Camera button top-right of Slide 2

**File:** `src/components/expense/ExpenseScreen.tsx`  

In the Slide 2 top bar (line 606-617), replace the empty spacer `<div className="w-9" />` with a circular camera icon button:

- Import `Camera` from lucide-react
- 36x36px (w-9 h-9), rounded-full, `bg-muted` background, Camera icon centered
- No onClick handler — purely decorative/non-functional
- Visually matches the back button on the left

---

## Change 4 — Dotted lines and particles only for selected members

**File:** `src/components/expense/MemberAvatarGrid.tsx`  

The SVG section (lines 67-106) currently iterates `members.map` and draws a line + particle for every member. Change:

- Pass `activeIds` into the SVG rendering loop
- For each member at index `i`, check `activeIds.has(members[i].id)`. If false, skip rendering that `<g>` element entirely (no path, no circle, no animation)
- When a member is toggled, the line and particle appear/disappear reactively since `activeIds` is already a prop that triggers re-render

No changes to animation timing, style, or color. Only gate rendering by selection state.

---

## Change 5 — Live split amount below each avatar

**File:** `src/components/expense/MemberAvatarGrid.tsx`  

Add new props: `splitAmounts?: Map<string, number>` (per-member dollar amount).

Below each member's name label (line 158), render the split amount:

- Format: `· $X.XX` (with `.00` dropped for round numbers per existing formatting rules)
- Only shown when the member is active/selected AND splitAmounts has a value for them
- Uses same `fontSize` tier as the name, muted-foreground color
- Combined into the name line: `"Kyle · $5"` as shown in reference image

**File:** `src/components/expense/ExpenseScreen.tsx`  

Compute `gridSplitAmounts` as a `Map<string, number>` that updates reactively:

- Equal mode: `distributeCents(totalNum, splitMembers.length)` → map each non-payer member to their share. Recomputes on every `amount` or `activeIds` change.
- Custom mode: read from `customAmounts` map for each grid member.
- Pass as prop to `MemberAvatarGrid`.

This uses `useMemo` depending on `amount`, `activeIds`, `splitMode`, `customAmounts`, `splitMembers`, and `gridMembers`. Division by zero guarded: if `splitMembers.length === 0` or `totalNum === 0`, all amounts are 0.

## Notes

- For gridSplitAmounts, compute using the filtered splitMembers array that already excludes the payer — the same array used to build the RPC payload, not the unfiltered one used for equal distribution math.
- For the description input, use a single input field with a single placeholder string — do not attempt to render bold prefix text inside the input field. Simple styled input only.

---

## Files touched

1. `src/components/expense/ExpenseScreen.tsx` — Changes 1, 2, 3, 5
2. `src/components/expense/MemberAvatarGrid.tsx` — Changes 4, 5

No other files modified. No new dependencies. No settlement/RPC/data layer changes.