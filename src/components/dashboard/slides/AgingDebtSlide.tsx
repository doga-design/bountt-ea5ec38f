import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/bountt-utils";
import type { AgingDebt } from "./useHeroData";

interface Props {
  agingDebts: AgingDebt[];
}

export default function AgingDebtSlide({ agingDebts }: Props) {
  const [index, setIndex] = useState(0);
  const [sessionDismissed, setSessionDismissed] = useState(false);

  if (agingDebts.length === 0 || sessionDismissed) return null;

  const debt = agingDebts[index % agingDebts.length];
  const hasMultiple = agingDebts.length > 1;

  const handleCycle = () => {
    setIndex((i) => (i + 1) % agingDebts.length);
  };

  const contextLine =
    debt.expenseType === "cover"
      ? debt.direction === "you_owe"
        ? <><span className="font-semibold">{debt.personName}</span> covered your <span className="font-semibold">{debt.expenseName}</span>. You owe {formatCurrency(debt.amount)}</>
        : <>You covered <span className="font-semibold">{debt.personName}</span>'s <span className="font-semibold">{debt.expenseName}</span> {debt.daysWaiting} days ago. Still waiting.</>
      : debt.direction === "you_owe"
        ? <>You owe <span className="font-semibold">{debt.personName}</span> {formatCurrency(debt.amount)} from <span className="font-semibold">{debt.expenseName}</span></>
        : <><span className="font-semibold">{debt.personName}</span> still owes you {formatCurrency(debt.amount)} from <span className="font-semibold">{debt.expenseName}</span></>;

  return (
    <div className="flex flex-col justify-center px-6 py-4 min-h-[200px]">
      {/* Big number + cycle */}
      <div className="flex items-center gap-3 mb-1">
        <span className="text-6xl font-extrabold text-white">{debt.daysWaiting}</span>
        {hasMultiple && (
          <button
            onClick={handleCycle}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
            aria-label="Next debt"
          >
            <RefreshCw className="w-4 h-4 text-white" />
          </button>
        )}
      </div>

      <p className="text-sm text-white/60 mb-3">days waiting</p>

      {/* Context */}
      <p className="text-sm text-white mb-4">{contextLine}</p>

      {/* Buttons */}
      <div className="flex gap-2">
        {debt.direction === "you_owe" ? (
          <>
            <button className="bg-white text-[hsl(18,89%,47%)] font-bold text-sm rounded-full px-5 py-2.5">
              Pay {debt.personName.split(" ")[0]}
            </button>
            <button
              onClick={() => setSessionDismissed(true)}
              className="border border-white/60 text-white font-bold text-sm rounded-full px-5 py-2.5"
            >
              Remind me later
            </button>
          </>
        ) : (
          <>
            <button className="bg-white text-[hsl(18,89%,47%)] font-bold text-sm rounded-full px-5 py-2.5">
              Settle up
            </button>
            <button
              onClick={() => setSessionDismissed(true)}
              className="border border-white/60 text-white font-bold text-sm rounded-full px-5 py-2.5"
            >
              Remind me later
            </button>
          </>
        )}
      </div>
    </div>
  );
}
