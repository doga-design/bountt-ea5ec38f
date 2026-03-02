import { Check } from "lucide-react";
import { Expense, ExpenseSplit, GroupMember } from "@/types";
import { formatCurrency } from "@/lib/bountt-utils";
import { getAvatarColor } from "@/lib/avatar-utils";
import { useApp } from "@/contexts/AppContext";

interface ExpenseCardProps {
  expense: Expense;
  splits: ExpenseSplit[];
  groupMembers: GroupMember[];
  onClick?: () => void;
}

export default function ExpenseCard({ expense, splits, groupMembers, onClick }: ExpenseCardProps) {
  const { user } = useApp();
  const isPayer = expense.paid_by_user_id === user?.id;
  const isCover = expense.expense_type === "cover";

  const payerMember = groupMembers.find(
    (m) =>
      (expense.paid_by_user_id && m.user_id === expense.paid_by_user_id) ||
      (!expense.paid_by_user_id && m.name === expense.paid_by_name && m.is_placeholder)
  );
  const payerColor = payerMember ? getAvatarColor(payerMember) : "#8B5CF6";

  // --- Color logic ---
  const ORANGE = "#E8480A";
  const GREEN = "#10B981";

  let accentColor: string;
  let amountColor: string;

  if (expense.is_settled) {
    accentColor = GREEN;
    amountColor = "hsl(var(--muted-foreground))";
  } else if (isPayer) {
    accentColor = ORANGE;
    amountColor = ORANGE;
  } else {
    accentColor = payerColor;
    amountColor = "hsl(var(--foreground))";
  }

  // --- Build subtitle per copy table ---
  const payerName = isPayer ? "You" : expense.paid_by_name;
  const payerLabelColor = expense.is_settled
    ? "hsl(var(--muted-foreground))"
    : isPayer
      ? ORANGE
      : payerColor;

  // Check if current user has a split
  const mySplit = splits.find((s) => s.user_id === user?.id);
  const isInvolved = isPayer || !!mySplit;

  let primaryLabel = "";
  let secondaryLabel = "";

  if (expense.is_settled) {
    // Settled states
    if (isCover) {
      primaryLabel = isPayer ? "You covered" : `${expense.paid_by_name} covered`;
      secondaryLabel = "paid back ✓";
    } else {
      primaryLabel = isPayer ? "You paid" : `${expense.paid_by_name} paid`;
      secondaryLabel = isPayer ? "all settled ✓" : "settled ✓";
    }
  } else if (isCover) {
    // Cover unsettled states
    const coveredSplit = splits[0]; // Cover has exactly one split
    const coveredName = coveredSplit?.member_name ?? "someone";
    const coveredIsMe = coveredSplit?.user_id === user?.id;

    if (isPayer) {
      primaryLabel = "You covered";
      secondaryLabel = `${coveredName} owes you ${formatCurrency(Number(coveredSplit?.share_amount ?? 0))}`;
    } else if (coveredIsMe) {
      primaryLabel = `${expense.paid_by_name} covered`;
      secondaryLabel = `you owe ${expense.paid_by_name} ${formatCurrency(Number(coveredSplit?.share_amount ?? 0))}`;
    } else {
      primaryLabel = `${expense.paid_by_name} covered ${coveredName}`;
      secondaryLabel = "just so you know";
    }
  } else {
    // Split unsettled states
    if (isPayer) {
      if (splits.length === 1) {
        primaryLabel = "You paid";
      } else if (splits.length === 2) {
        const other = splits.find((s) => s.user_id !== user?.id);
        primaryLabel = "You paid";
        secondaryLabel = `split with ${other?.member_name ?? "someone"}`;
      } else {
        primaryLabel = "You paid";
        secondaryLabel = `split ${splits.length} ways`;
      }
    } else if (mySplit) {
      primaryLabel = `${expense.paid_by_name} paid`;
      secondaryLabel = `you owe ${formatCurrency(Number(mySplit.share_amount))}`;
    } else {
      // Not involved
      const names = splits.map((s) => s.member_name);
      primaryLabel = `${expense.paid_by_name} paid`;
      secondaryLabel = `between ${names.join(" & ")}`;
    }
  }

  // --- Split indicator ---
  let splitIndicator: React.ReactNode = null;
  if (expense.is_settled) {
    splitIndicator = (
      <span className="flex items-center gap-0.5 text-xs" style={{ color: GREEN }}>
        settled <Check className="w-3 h-3" />
      </span>
    );
  } else if (isCover) {
    splitIndicator = <span className="text-xs text-muted-foreground">cover</span>;
  } else if (splits.length === 2) {
    const isEqual = splits.every((s) => Number(s.share_amount) === Number(splits[0].share_amount));
    splitIndicator = <span className="text-xs text-muted-foreground">{isEqual ? "50 / 50" : "custom split"}</span>;
  } else if (splits.length > 2) {
    const isEqual = splits.every((s) => Number(s.share_amount) === Number(splits[0].share_amount));
    splitIndicator = <span className="text-xs text-muted-foreground">{isEqual ? `${splits.length}-way` : "custom split"}</span>;
  }

  const settledTextClass = expense.is_settled ? "text-muted-foreground" : "";

  return (
    <div
      onClick={onClick}
      className="bg-card rounded-2xl p-4 border-l-4 flex items-start justify-between cursor-pointer active:opacity-80 transition-opacity"
      style={{ borderColor: accentColor }}
    >
      {/* Left: title + subtitle */}
      <div className="min-w-0 flex-1">
        <p className={`font-semibold text-sm ${settledTextClass || "text-foreground"}`}>
          {expense.description}
        </p>
        <p className="text-xs mt-0.5 flex items-center gap-0 flex-wrap">
          <span style={{ color: payerLabelColor }}>
            {primaryLabel}
          </span>
          {secondaryLabel && (
            <>
              <span className="text-muted-foreground mx-1">·</span>
              <span className="text-muted-foreground">{secondaryLabel}</span>
            </>
          )}
        </p>
      </div>

      {/* Right: amount + split indicator */}
      <div className="text-right flex-shrink-0 ml-3">
        <span
          className="text-sm font-semibold"
          style={{ color: amountColor }}
        >
          {formatCurrency(Number(expense.amount))}
        </span>
        {splitIndicator && <div className="mt-0.5">{splitIndicator}</div>}
      </div>
    </div>
  );
}
