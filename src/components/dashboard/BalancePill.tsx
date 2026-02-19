import { Layers } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { formatCurrency } from "@/lib/bountt-utils";

export default function BalancePill() {
  const { expenses, groupMembers, user, expenseSplits } = useApp();

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
    // Find if the expense is unsettled
    const expense = expenses.find((e) => e.id === split.expense_id);
    if (!expense || expense.is_settled) continue;
    if (split.user_id === user?.id || (!split.user_id && groupMembers.find((m) => m.user_id === user?.id && m.name === split.member_name))) {
      totalOwed += Number(split.share_amount);
    }
  }

  const net = totalPaid - totalOwed;

  if (net === 0) return null;

  const label = net > 0 ? `${formatCurrency(net)} owed` : `${formatCurrency(Math.abs(net))} owing`;

  return (
    <div className="flex items-center gap-1.5 bg-primary-foreground/20 rounded-full px-3 py-1">
      <Layers className="w-3.5 h-3.5 text-primary-foreground" />
      <span className="text-xs font-medium text-primary-foreground">{label}</span>
    </div>
  );
}
