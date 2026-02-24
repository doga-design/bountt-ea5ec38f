interface SaveButtonProps {
  splitMode: "equal" | "custom";
  canSave: boolean;
  isBalanced: boolean;
  loading: boolean;
  onClick: () => void;
  isSingleUser?: boolean;
}

export default function SaveButton({
  splitMode,
  canSave,
  isBalanced,
  loading,
  onClick,
  isSingleUser = false,
}: SaveButtonProps) {
  const isCustomReady = splitMode === "custom" && isBalanced && canSave && !isSingleUser;
  const isDefaultReady = splitMode === "equal" && canSave && !isSingleUser;
  const enabled = isCustomReady || isDefaultReady;

  return (
    <div className="px-4 pb-2 pt-3">
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
        {loading ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
