interface AmountDisplayProps {
  amount: string;
  showCursor?: boolean;
  size?: "large" | "medium";
  splitMode?: "equal" | "custom";
  remaining?: number;
  isBalanced?: boolean;
  onDistribute?: () => void;
  canDistribute?: boolean;
}

export default function AmountDisplay({
  amount,
  showCursor = false,
  size = "large",
  splitMode,
  remaining = 0,
  isBalanced = false,
  onDistribute,
  canDistribute = false,
}: AmountDisplayProps) {
  const display = amount === "0" ? "0" : amount;
  const total = parseFloat(amount) || 0;
  const isLarge = size === "large";

  // Custom mode status pill (Slide 2 only)
  const showCustomStatus = splitMode === "custom";

  let statusNode: React.ReactNode = null;
  if (showCustomStatus) {
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

    statusNode = showButton ? (
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
        }}
      >
        {buttonLabel}
      </button>
    ) : (
      <span className="text-xs font-semibold mt-1" style={{ color: statusColor }}>
        {statusText}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-center transition-all">
      <div className="flex items-baseline justify-center">
        <span className="font-sora font-bold text-muted-foreground mr-1" style={{ fontSize: isLarge ? 34 : 24 }}>
          $
        </span>
        <span
          className="font-sora font-extrabold text-foreground leading-none"
          style={{
            fontSize: isLarge ? 72 : 52,
            letterSpacing: "-0.07em",
          }}
        >
          {display}
        </span>
        {showCursor && (
          <span
            className="rounded-full ml-1 animate-blink"
            style={{
              width: 3,
              height: isLarge ? 52 : 38,
              backgroundColor: "#D94F00",
            }}
          />
        )}
      </div>
      {statusNode}
    </div>
  );
}
