

# Clean Up Expense Entry UI — Eliminate Confusion

## Analysis: What's Actually Happening

There is **no functional redundancy**. The two controls serve different purposes:

| Control | Purpose | Location |
|---------|---------|----------|
| Member chips row | Select who is **included in the split** (recipients) | Top of screen |
| Tappable payer name in sentence | Select who **paid** | Middle of screen |

The confusion comes from **presentation**, not duplication:
- The "You" chip looks like it might mean "You paid"
- The sentence payer is tappable but doesn't look tappable at first glance
- No labels explain what the chips row is for

## Solution: Add Context Labels (Minimal, High-Impact)

Rather than restructuring the entire UI (which works well functionally), add a small **section label** above the chips to clarify their purpose, and keep the sentence-based payer selector as-is (it already works and reads naturally).

### Change 1: Add "Split between" label above chips

In `MemberChipSelector.tsx`, add a subtle label above the chip row:

```text
SPLIT BETWEEN:
[You] [Kyle] [Sarah] [+ Add]
```

This immediately communicates that the chips are for selecting split recipients, not the payer. Uses the same uppercase tracking style as "TOTAL" in AmountDisplay for visual consistency.

### Change 2: No changes to SplitSentence

The sentence already works well: **"You paid, splitting equally with Kyle and Sarah"**. The dotted underline on "You" (payer) and "equally" (mode) is a clear enough affordance. Adding the "SPLIT BETWEEN" label above the chips removes the ambiguity about what the chips do, which was the source of confusion.

## Files Modified

| File | Change |
|------|--------|
| `src/components/expense/MemberChipSelector.tsx` | Add "SPLIT BETWEEN" label above the chips row |

## Why This Is the Right Fix

- **One line of UI** eliminates all confusion
- No structural changes needed -- the current architecture is correct
- Consistent with existing design language (matches "TOTAL" label in AmountDisplay)
- The chips clearly mean "who shares this cost"
- The sentence clearly means "who paid and how to divide"
- Works for all scenarios: you pay, others pay, you excluded, placeholders, custom mode
