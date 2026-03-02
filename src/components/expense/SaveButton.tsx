import { Plus, ArrowRight } from "lucide-react";

interface SaveButtonProps {
  active: boolean;
  loading: boolean;
  onClick: () => void;
  label?: string;
  /** If true, shake on tap when disabled (Slide 1 behavior) */
  shakeOnDisabled?: boolean;
}

export default function SaveButton({
  active,
  loading,
  onClick,
  label = "Log cost",
  shakeOnDisabled = false,
}: SaveButtonProps) {
  const handleClick = () => {
    if (loading) return;
    if (!active && !shakeOnDisabled) return;
    onClick();
  };

  return (
    <div className="px-4 pb-2 pt-3">
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full rounded-[18px] py-4 font-sora text-[17px] font-extrabold transition-all active:scale-[0.985] flex items-center justify-center gap-2"
        style={{
          backgroundColor: active ? "#D94F00" : "#EAEAE6",
          color: active ? "#FFFFFF" : "#C0C0BC",
          boxShadow: active ? "0 4px 14px rgba(217,79,0,0.3)" : "none",
          cursor: !active && !shakeOnDisabled ? "default" : "pointer",
        }}
      >
        {loading ? "Saving..." : label}
        {!loading && (
          active ? (
            <Plus className="w-5 h-5" strokeWidth={3} />
          ) : (
            <ArrowRight className="w-5 h-5" strokeWidth={3} />
          )
        )}
      </button>
    </div>
  );
}
