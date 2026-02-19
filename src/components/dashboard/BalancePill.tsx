import { Layers } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { formatCurrency } from "@/lib/bountt-utils";

export default function BalancePill() {
  const { expenses, user, expenseSplits } = useApp();

  // Calculate net balance for current user
  let totalPaid = 0;
  let totalOwed = 0;

  for (const expense of expenses) {
    if (expense.is_settled) continue;
    if (expense.paid_by_user_id === user?.id) {
      totalPaid += Number(expense.amount);
    }
  }

  for (const split of expenseSplits) {
    const expense = expenses.find((e) => e.id === split.expense_id);
    if (!expense || expense.is_settled) continue;
    if (split.user_id === user?.id) {
      totalOwed += Number(split.share_amount);
    }
  }

  const net = totalPaid - totalOwed;

  if (net === 0) return null;

  const label = net > 0 ? `${formatCurrency(net)} owed` : `${formatCurrency(Math.abs(net))} owing`;

  return (
    <div className="flex items-center gap-1.5 bg-primary-foreground/20 rounded-xl px-3 py-1.5">
      <Layers className="w-4 h-4 text-primary-foreground" />
      <span className="text-sm font-semibold text-primary-foreground">{label}</span>
    </div>
  );
}
