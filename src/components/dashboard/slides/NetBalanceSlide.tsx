import { useState, useRef } from "react";
import { formatCurrency } from "@/lib/bountt-utils";
import type { DebtItem } from "./useHeroData";

const MAX_DISMISSALS = 4;
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

interface Props {
  netBalance: number;
  totalOwedToYou: number;
  totalYouOwe: number;
  debtsYouOwe: DebtItem[];
  groupId: string;
}

function isCoolingDown(groupId: string): boolean {
  const raw = localStorage.getItem(`bountt_hero_cooldown_${groupId}`);
  if (!raw) return false;
  return Date.now() < Number(raw);
}

export default function NetBalanceSlide({ netBalance, totalOwedToYou, totalYouOwe, debtsYouOwe, groupId }: Props) {
  const [debtIndex, setDebtIndex] = useState(0);
  const [dismissed, setDismissed] = useState(() => isCoolingDown(groupId));
  const dismissCount = useRef(0);

  const badge =
    netBalance > 0 ? "You're up" : netBalance === 0 ? "You're even" : "You're behind";

  const prefix = netBalance > 0 ? "+" : netBalance < 0 ? "-" : "";
  const displayAmount = formatCurrency(Math.abs(netBalance));

  const showActionRow = !dismissed && debtsYouOwe.length > 0 && debtIndex < debtsYouOwe.length;
  const currentDebt = showActionRow ? debtsYouOwe[debtIndex] : null;

  const handleNotYet = () => {
    dismissCount.current += 1;

    if (dismissCount.current >= MAX_DISMISSALS || debtIndex + 1 >= debtsYouOwe.length) {
      setDismissed(true);
      if (dismissCount.current >= MAX_DISMISSALS) {
        localStorage.setItem(
          `bountt_hero_cooldown_${groupId}`,
          String(Date.now() + COOLDOWN_MS)
        );
      }
    } else {
      setDebtIndex((i) => i + 1);
    }
  };

  // Directional CTA
  const isOwed = currentDebt?.direction === "owed_to_you";
  const ctaLabel = isOwed
    ? `Settle Up`
    : `Pay ${currentDebt?.payerName.split(" ")[0] ?? ""}`;
  const microCopy = currentDebt
    ? isOwed
      ? `${currentDebt.payerName} owes ${formatCurrency(currentDebt.amount)} to you`
      : `${formatCurrency(currentDebt.amount)} owed to ${currentDebt.payerName}`
    : "";

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
                {currentDebt.expenseName}
              </p>
              <p className="text-xs text-white/60">
                {microCopy}
              </p>
            </div>
            <div className="flex gap-2 ml-3 shrink-0">
              <button className="bg-white text-[hsl(18,89%,47%)] font-bold text-xs rounded-full px-4 py-2">
                {ctaLabel}
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
