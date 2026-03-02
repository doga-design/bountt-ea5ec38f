interface AmountDisplayProps {
  amount: string;
  splitMode: "equal" | "custom";
  remaining: number; // total - sum of custom amounts
  isBalanced: boolean;
  onDistribute?: () => void;
  canDistribute?: boolean;
}

export default function AmountDisplay({
  amount,
  splitMode,
  remaining,
  isBalanced,
  onDistribute,
  canDistribute = false,
}: AmountDisplayProps) {
  const display = amount === "0" ? "0" : amount;
  const total = parseFloat(amount) || 0;

  if (splitMode === "custom") {
    const overBudget = remaining < -0.01;
    const unassigned = remaining > 0.01;
    const showButton = canDistribute && Math.abs(remaining) > 0.01 && total > 0;

    let statusText = "assign to everyone";
    let statusColor = "hsl(var(--muted-foreground))";

    if (total === 0) {
      statusText = "assign to everyone";
    } else if (isBalanced) {
      statusText = "perfectly split ✓";
      statusColor = "#22C55E";
    } else if (overBudget) {
      statusText = `$${Math.abs(remaining).toFixed(2)} over total`;
      statusColor = "#EF4444";
    } else if (unassigned) {
      statusText = `$${remaining.toFixed(2)} left to assign`;
    }

    const buttonLabel = overBudget
      ? `Remove $${Math.abs(remaining).toFixed(2)} →`
      : `Distribute $${remaining.toFixed(2)} →`;

    return (
      <div className="flex flex-col items-center py-2 transition-all">
        <span
          className="font-sora text-xs font-bold uppercase text-muted-foreground"
          style={{ letterSpacing: "0.1em" }}
        >
          TOTAL
        </span>
        <div className="flex items-baseline">
          <span className="font-sora text-3xl font-bold text-muted-foreground mr-0.5">
            $
          </span>
          <span
            className="font-sora text-[52px] font-extrabold text-foreground"
            style={{ letterSpacing: "-0.07em" }}
          >
            {display}
          </span>
        </div>
        {showButton ? (
          <button
            type="button"
            onClick={onDistribute}
            className="mt-1 px-4 py-1.5 rounded-full font-bold transition-transform active:scale-[0.96]"
            style={{
              background: "#FFF0E8",
              border: "1.5px solid rgba(217, 79, 0, 0.6)",
              color: "#D94F00",
              fontSize: "13px",
              fontWeight: 700,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {buttonLabel}
          </button>
        ) : (
          <span className="text-xs font-semibold mt-1" style={{ color: statusColor }}>
            {statusText}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-baseline justify-center py-4 transition-all">
      <span className="font-sora text-[34px] font-bold text-muted-foreground mr-1">
        $
      </span>
      <span
        className="font-sora text-[80px] font-extrabold text-foreground leading-none"
        style={{ letterSpacing: "-0.07em" }}
      >
        {display}
      </span>
      <span
        className="w-[3px] h-[60px] rounded-full ml-1 animate-blink"
        style={{ backgroundColor: "hsl(var(--primary))" }}
      />
    </div>
  );
}
