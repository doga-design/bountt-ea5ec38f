import { useMemo } from "react";
import { useApp } from "@/contexts/AppContext";

export interface HeroData {
  netBalance: number;
}

export function useHeroData(): HeroData {
  const { expenses, expenseSplits, user } = useApp();
  const userId = user?.id ?? "";

  return useMemo(() => {
    const unsettled = expenses.filter((e) => !e.is_settled);

    let totalOwedToYou = 0;
    let totalYouOwe = 0;

    for (const expense of unsettled) {
      if (expense.paid_by_user_id === userId) {
        const otherSplits = expenseSplits.filter(
          (s) => s.expense_id === expense.id && s.user_id !== userId && !s.is_settled
        );
        for (const s of otherSplits) {
          totalOwedToYou += s.share_amount;
        }
      } else {
        const mySplit = expenseSplits.find(
          (s) => s.expense_id === expense.id && s.user_id === userId
        );
        if (mySplit && !mySplit.is_settled) {
          totalYouOwe += mySplit.share_amount;
        }
      }
    }

    return { netBalance: totalOwedToYou - totalYouOwe };
  }, [expenses, expenseSplits, userId]);
}
