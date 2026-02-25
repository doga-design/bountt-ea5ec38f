

# Simplify Expense Entry: One Tap Pattern for Member Selection

## What Changes

The current UI has three ways to interact with split members (tap name to remove, [+] button to open drawer, drawer "Add new member" button). This consolidates to ONE pattern:

**Tap any member name in the sentence --> opens the member selection drawer**

No [+] button. No "Add new member" inside the drawer. No tap-to-remove. Just one clear action per tap.

## Interaction Model After Change

```text
"You paid, splitting equally with Kyle & Sarah"
  ^              ^                ^        ^
  |              |                |        |
  cycles       toggles         opens     opens
  payer        mode            drawer    drawer
```

- **Payer name** ("You"): tap to cycle payer (unchanged)
- **"equally"/"custom"**: tap to toggle mode (unchanged)  
- **Any split member name** ("Kyle", "Sarah", "yourself"): tap to open member selection drawer with checkboxes
- **No [+] button** anywhere

## Files Modified

| File | Change |
|------|--------|
| `src/components/expense/SplitSentence.tsx` | Change name tap from `onToggleMember` to opening drawer; remove [+] button; remove "Add new member" from drawer; remove `onAddPress` prop |
| `src/components/expense/ExpenseScreen.tsx` | Remove `AddMemberSheet` import, state, handler, JSX, and `onAddPress` prop passed to SplitSentence |

## Technical Details

### SplitSentence.tsx

1. Remove `onAddPress` from props interface
2. Change `renderName` onClick from `onToggleMember(member.id)` to `setSheetOpen(true)` (opens the drawer instead of removing the member)
3. Change the "yourself" button onClick similarly
4. Remove the [+] button (lines 136-142)
5. Remove "Add new member" button from the drawer (lines 182-191)

### ExpenseScreen.tsx

1. Remove `import AddMemberSheet` (line 15)
2. Remove `addMemberOpen` state (line 37)
3. Remove `handleAddMember` function (lines 358-378)
4. Remove `<AddMemberSheet>` JSX (lines 468-473)
5. Remove `onAddPress` prop from `<SplitSentence>` (line 423)

## Edge Cases

- **Minimum 1 member enforced**: `handleToggleChip` already prevents unchecking the last member (`if (next.size <= 1) return prev`)
- **Payer excluded from split**: Allowed -- the drawer lets you uncheck the payer
- **Single user group**: Shows "assigning a split" (existing `isSingleUser` guard, unchanged)
- **Custom mode**: Toggling members in the drawer redistributes amounts equally (existing `handleToggleChip` logic, unchanged)
