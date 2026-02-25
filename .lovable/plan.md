

# Remove User Chips UI and Rewrite Split Selection Logic

## Current State Analysis

### How the System Works Today

The expense entry screen has **three** split-related UI layers:

```text
+------------------------------------------+
| SPLIT BETWEEN           (label)          |
| [You] [Kyle] [Sarah]  [+ Add]  (chips)  |
+------------------------------------------+
|            $50.00             (amount)    |
+------------------------------------------+
| You paid, splitting equally              |
|        with Kyle & Sarah     (sentence)  |
+------------------------------------------+
| (Custom rows, if custom mode)            |
+------------------------------------------+
```

**Chips (`MemberChipSelector.tsx`)** control:
- `activeIds: Set<string>` -- which members are in the split
- Tap chip = toggle member in/out of split
- "+ Add" button = open AddMemberSheet for new placeholders
- Visual states: filled (in split) vs outlined (out of split)

**Sentence (`SplitSentence.tsx`)** controls:
- Payer selection (tap name to cycle)
- Split mode toggle (tap "equally"/"custom")
- Displays who is in the split (read-only names)

**Custom rows (`CustomSplitRows.tsx`)** control:
- Which member's amount the numpad edits (tap row to focus)
- Display per-member custom amounts

### State Variables Affected by Chips

| Variable | Type | Set by chips? | Also used by |
|----------|------|--------------|-------------|
| `activeIds` | `Set<string>` | YES (primary control) | selectedMembers memo, split math |
| `customAmounts` | `Map<string, string>` | Indirectly (redistributes on toggle) | Custom rows, save logic |
| `focusedMemberId` | `string or null` | Indirectly (resets on toggle) | Custom rows, numpad |

### What Breaks If Chips Are Removed

1. No way to add/remove members from the split
2. No way to add new placeholder members
3. In custom mode, no impact (rows already handle focus)

---

## New Design: Sentence-Only Controls

### Layout After Change

```text
+------------------------------------------+
|            $50.00              (amount)   |
+------------------------------------------+
| You paid, splitting equally              |
|   with Kyle & Sarah  [+]     (sentence)  |
+------------------------------------------+
| (Custom rows, if custom mode)            |
+------------------------------------------+
```

The chips row is completely gone. The sentence is the single source of truth.

### Interaction Model

**Tap a member name in the sentence** -- removes them from the split (strikethrough flash, then name disappears from sentence). Minimum 1 member enforced (cannot remove last person).

**Tap the [+] button at end of sentence** -- opens a bottom sheet with:
- All active group members listed with checkboxes (checked = in split)
- Toggle any member in/out
- "Add new member" option at the bottom (opens existing AddMemberSheet)
- Close sheet to apply changes

**Tap payer name** -- cycles through active members (unchanged)

**Tap "equally"/"custom"** -- toggles split mode (unchanged)

**In custom mode** -- tap rows to focus (unchanged, CustomSplitRows already works)

### Why This Design

- **Tap-to-remove names** covers the most common action (excluding yourself or one person) with a single tap -- faster than chips
- **[+] sheet** covers the less common action (adding someone back, adding a new member) without cluttering the main view
- **No duplicate controls** -- one way to do each thing
- **Works for all scenarios**: you pay, others pay, you excluded, placeholders, custom mode

---

## Implementation Plan

### Files to Modify

| File | Change |
|------|--------|
| `src/components/expense/SplitSentence.tsx` | Make names tappable (remove on tap), add [+] button, add member-selection sheet |
| `src/components/expense/ExpenseScreen.tsx` | Remove MemberChipSelector import and rendering, move "+ Add" logic to SplitSentence props |

### Files to Delete

| File | Reason |
|------|--------|
| `src/components/expense/MemberChipSelector.tsx` | Entire component replaced by sentence controls |

### Step-by-Step Changes

**Step 1: Enhance SplitSentence component**

New props added:
- `allActiveMembers: GroupMember[]` -- all active group members (for the sheet)
- `onToggleMember: (memberId: string) => void` -- toggle member in/out of split
- `onAddPress: () => void` -- open AddMemberSheet for new placeholders
- `activeIds: Set<string>` -- which members are currently in split (for sheet checkboxes)

New behavior:
- Each member name in the sentence gets an `onClick` that calls `onToggleMember(m.id)` to remove them
- A small circular [+] button appears after the names
- Tapping [+] opens a Drawer/Sheet listing all `allActiveMembers` with checkboxes
- The sheet has a "New member" button at bottom that calls `onAddPress`

**Step 2: Update ExpenseScreen**

- Remove `<MemberChipSelector>` from the JSX (lines 401-408)
- Remove the import of `MemberChipSelector` (line 10)
- Pass new props to `<SplitSentence>`: `allActiveMembers`, `onToggleMember: handleToggleChip`, `onAddPress`, `activeIds`
- The existing `handleToggleChip` function stays unchanged -- it already handles the toggle logic, custom mode redistribution, and minimum-1-member check

**Step 3: Delete MemberChipSelector.tsx**

The file is no longer imported anywhere and can be safely deleted.

### Edge Cases Handled

- **Remove last member**: `handleToggleChip` already prevents removing the last member (`if (next.size <= 1) return prev`)
- **Custom mode redistribution**: `handleToggleChip` already redistributes equally when members change in custom mode
- **Add new placeholder**: The `onAddPress` callback chains through to the existing `AddMemberSheet` and `handleAddMember` logic
- **Payer removed from split**: Allowed -- payer doesn't need to be in the split
- **All names removed except one**: That one name still shows, can't be tapped to remove (minimum enforced)

