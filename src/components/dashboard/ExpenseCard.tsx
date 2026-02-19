import { Package } from "lucide-react";
import { Expense, ExpenseSplit } from "@/types";
import { formatCurrency } from "@/lib/bountt-utils";
import { useApp } from "@/contexts/AppContext";

interface ExpenseCardProps {
  expense: Expense;
  splits: ExpenseSplit[];
}

export default function ExpenseCard({ expense, splits }: ExpenseCardProps) {
  const { user } = useApp();
  const isPayer = expense.paid_by_user_id === user?.id;

  // Find the other person's share to display
  const otherSplit = splits.find((s) =>
    isPayer ? s.user_id !== user?.id : s.user_id === user?.id
  );
  const shareLabel = otherSplit
    ? `${isPayer ? otherSplit.member_name : "Your"}'s share is ${formatCurrency(otherSplit.share_amount)}`
    : "";

  return (
    <div className="bg-card rounded-2xl p-4 flex items-start justify-between">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <Package className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">{expense.description}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Paid by <span className="font-medium">{isPayer ? "You" : expense.paid_by_name}</span>
          </p>
        </div>
      </div>
      <div className="text-right">
        <span className="inline-block bg-muted text-foreground text-sm font-semibold px-3 py-1 rounded-full">
          {formatCurrency(expense.amount)}
        </span>
        {shareLabel && (
          <p className="text-xs text-muted-foreground mt-1">{shareLabel}</p>
        )}
      </div>
    </div>
  );
}
