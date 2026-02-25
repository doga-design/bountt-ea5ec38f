# Fix Custom Split Input Bugs

## Bug 1: Numpad allows exceeding total in custom mode

**Root cause:** The `handleKey` function in `ExpenseScreen.tsx` has no upper-bound check when typing into a custom split row. Users can keep entering digits via the numpad even after a member's value already covers or exceeds the total, resulting in "over total" states that shouldn't be reachable via manual input.

**Fix:** In the numpad handler's custom-focused branch (both the `freshFocus` path and the normal path), after computing the new value, check if it would exceed the maximum allowable amount for that member. The max is `totalNum - (sum of all OTHER members' amounts)`. If the new value exceeds this max, reject the keystroke (return the previous value unchanged).

### Changes in `src/components/expense/ExpenseScreen.tsx` (lines 160-183)

Add a clamping check in both custom input branches:

```typescript
if (isCustomFocused) {
  // Calculate max this member can have
  const maxForMember = (() => {
    let othersSum = 0;
    for (const id of activeIds) {
      if (id !== focusedMemberId) {
        othersSum += parseFloat(customAmounts.get(id) || "0") || 0;
      }
    }
    return Math.max(0, totalNum - othersSum);
  })();

  if (freshFocus) {
    setFreshFocus(false);
    setCustomAmounts((prev) => {
      const next = new Map(prev);
      let newVal: string;
      if (key === "del") newVal = "0";
      else if (key === ".") newVal = "0.";
      else newVal = key;

      if (parseFloat(newVal) > maxForMember) return prev;
      next.set(focusedMemberId!, newVal);
      return next;
    });
    return;
  }
  setCustomAmounts((prev) => {
    const next = new Map(prev);
    const current = next.get(focusedMemberId!) ?? "0";
    const newVal = updateField(current);
    if (parseFloat(newVal) > maxForMember) return prev;
    next.set(focusedMemberId!, newVal);
    return next;
  });
}
```

This prevents any single member's value from exceeding what's available after accounting for all other members' assigned amounts. Keystrokes that would cause an excess are silently rejected.  
  
**Error Indicator UX:** When keystroke is rejected (over max), user might not notice.   
Consider:  
**Visual shake/flash**

- Input row shakes briefly
- Indicates "can't add more"

---

## Bug 2: "You" row not editable when custom mode first opens

**Root cause:** In `toggleMode` (line 199-212), when switching to custom mode, `setFocusedMemberId(selectedMembers[0]?.id)` is called but `setFreshFocus(true)` is NOT called. The first member ("You") gets an equally-distributed value like "5.00", but without `freshFocus` being true, typing "3" appends to produce "5.003" instead of replacing with "3". This makes it appear non-editable/broken.

**Fix:** Add `setFreshFocus(true)` in the `toggleMode` function right after setting the focused member.

### Changes in `src/components/expense/ExpenseScreen.tsx` (line 204)

```typescript
setSplitMode("custom");
const total = parseFloat(amount) || 0;
setCustomAmounts(distributeEqually(total, selectedMembers));
setFocusedMemberId(selectedMembers[0]?.id ?? null);
setFreshFocus(true);  // <-- ADD THIS LINE
setEditingTotal(false);
```

---

## Files Modified


| File                                       | Change                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `src/components/expense/ExpenseScreen.tsx` | Add max-value clamping in numpad custom input handler; add `setFreshFocus(true)` in `toggleMode` |
