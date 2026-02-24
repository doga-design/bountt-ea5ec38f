import { useState } from "react";
import { formatCurrency } from "@/lib/bountt-utils";
import type { DebtItem } from "./useHeroData";

interface Props {
  netBalance: number;
  totalOwedToYou: number;
  totalYouOwe: number;
  debtsYouOwe: DebtItem[];
}

export default function NetBalanceSlide({ netBalance, totalOwedToYou, totalYouOwe, debtsYouOwe }: Props) {
  const [debtIndex, setDebtIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const badge =
    netBalance > 0 ? "You're up" : netBalance === 0 ? "You're even" : "You're behind";

  const prefix = netBalance > 0 ? "+" : netBalance < 0 ? "-" : "";
  const displayAmount = formatCurrency(Math.abs(netBalance));

  const showActionRow = !dismissed && debtsYouOwe.length > 0 && debtIndex < debtsYouOwe.length;
  const currentDebt = showActionRow ? debtsYouOwe[debtIndex] : null;

  const handleNotYet = () => {
    if (debtIndex + 1 >= debtsYouOwe.length) {
      setDismissed(true);
    } else {
      setDebtIndex((i) => i + 1);
    }
  };

  return (
    <div className="flex flex-col justify-center px-6 py-4 min-h-[200px]">
      {/* Badge */}
      <div className="mb-2">
        <span className="inline-block bg-white/20 text-white text-xs font-semibold rounded-full px-3 py-1">
          {badge}
        </span>
      </div>

      {/* Large balance */}
      <div className="flex items-baseline gap-0.5 mb-1">
        {prefix && (
          <span className="text-5xl font-extrabold text-white/40">{prefix}</span>
        )}
        <span className="text-5xl font-extrabold text-white">{displayAmount}</span>
      </div>

      {/* Breakdown */}
      <div className="space-y-0.5 mb-2">
        <p className="text-sm text-white/60">
          <span className="font-semibold text-white">{formatCurrency(totalOwedToYou)}</span>{" "}
          owed to you
        </p>
        <p className="text-sm text-white/60">
          <span className="font-semibold text-white">{formatCurrency(totalYouOwe)}</span>{" "}
          you owe
        </p>
      </div>

      {/* Action row */}
      {showActionRow && currentDebt && (
        <div className="border-t border-white/20 pt-3 mt-1">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">
                {currentDebt.payerName} · {currentDebt.expenseName}
              </p>
              <p className="text-xs text-white/60">
                {formatCurrency(currentDebt.amount)} to settle
              </p>
            </div>
            <div className="flex gap-2 ml-3 shrink-0">
              <button className="bg-white text-[hsl(18,89%,47%)] font-bold text-xs rounded-full px-4 py-2">
                Pay {currentDebt.payerName.split(" ")[0]}
              </button>
              <button
                onClick={handleNotYet}
                className="border border-white/60 text-white font-bold text-xs rounded-full px-4 py-2"
              >
                Not yet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
