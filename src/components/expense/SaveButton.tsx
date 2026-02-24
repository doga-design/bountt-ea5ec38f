interface SaveButtonProps {
  splitMode: "equal" | "custom";
  canSave: boolean;
  isBalanced: boolean;
  loading: boolean;
  onClick: () => void;
}

export default function SaveButton({
  splitMode,
  canSave,
  isBalanced,
  loading,
  onClick,
}: SaveButtonProps) {
  const isCustomReady = splitMode === "custom" && isBalanced && canSave;
  const isDefaultReady = splitMode === "equal" && canSave;
  const enabled = isCustomReady || isDefaultReady;

  return (
    <div className="px-5 pb-5 pt-2">
      <button
        onClick={onClick}
        disabled={!enabled || loading}
        className="w-full rounded-[18px] py-4 font-sora text-[17px] font-extrabold transition-all active:scale-[0.985]"
        style={{
          backgroundColor: !enabled
            ? "#EAEAE6"
            : isCustomReady
            ? "#3B82F6"
            : "hsl(var(--primary))",
          color: !enabled ? "#C0C0BC" : "#FFFFFF",
          boxShadow: !enabled
            ? "none"
            : isCustomReady
            ? "0 4px 14px rgba(37,99,235,0.28)"
            : "0 4px 14px rgba(217,79,0,0.3)",
        }}
      >
        {loading ? "Saving..." : "Save Expense"}
      </button>
    </div>
  );
}
