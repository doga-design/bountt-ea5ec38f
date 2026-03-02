import { GroupMember } from "@/types";
import { getAvatarColor } from "@/lib/avatar-utils";

interface CustomSplitRowsProps {
  members: GroupMember[];
  currentUserId: string | undefined;
  customAmounts: Map<string, string>;
  focusedMemberId: string | null;
  shakeMemberId: string | null;
  onFocus: (memberId: string) => void;
  visible: boolean;
  isCoverMode: boolean;
  payerMemberId: string | undefined;
  onExcludeSelf: () => void;
  onAddSelfBack: () => void;
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function CustomSplitRows({
  members,
  currentUserId,
  customAmounts,
  focusedMemberId,
  shakeMemberId,
  onFocus,
  visible,
  isCoverMode,
  payerMemberId,
  onExcludeSelf,
  onAddSelfBack,
}: CustomSplitRowsProps) {
  // In cover mode, show the payer's ghosted row + other members
  // When not visible and not cover mode, collapse entirely
  const showPanel = visible || isCoverMode;

  return (
    <div
      className="px-5 overflow-hidden transition-all duration-300"
      style={{
        maxHeight: showPanel ? `${(members.length + (isCoverMode ? 1 : 0)) * 80}px` : "0px",
        opacity: showPanel ? 1 : 0,
      }}
    >
      <div className="space-y-1.5 py-2">
        {/* Ghosted payer row when in cover mode */}
        {isCoverMode && payerMemberId && (() => {
          // Find the payer member from full context (they're excluded from `members` in cover mode)
          return (
            <button
              key="cover-self-row"
              onClick={onAddSelfBack}
              className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 transition-all text-left"
              style={{
                backgroundColor: "hsl(var(--muted) / 0.3)",
                border: "2px dashed hsl(var(--muted-foreground) / 0.2)",
                opacity: 0.5,
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-extrabold text-muted-foreground truncate">
                  You
                </p>
                <p className="text-xs font-semibold text-primary">
                  Add myself back →
                </p>
              </div>
              <div className="flex items-baseline">
                <span className="text-sm font-bold text-muted-foreground/50 mr-0.5">$</span>
                <span className="text-[26px] font-extrabold font-sora text-muted-foreground/50">
                  0
                </span>
              </div>
            </button>
          );
        })()}

        {members.map((m) => {
          const isSelf = m.user_id === currentUserId;
          const isPayer = m.id === payerMemberId;
          const isFocused = focusedMemberId === m.id;
          const isShaking = shakeMemberId === m.id;
          const amountStr = customAmounts.get(m.id) ?? "0";
          const displayAmount = amountStr === "0" ? "0" : amountStr;

          const focusColor = isSelf ? "hsl(var(--primary))" : "#3B82F6";

          // Subtitle logic
          let subtitle: string;
          if (isCoverMode) {
            subtitle = isFocused ? "editing ↑" : "tap to edit";
          } else if (isSelf && isPayer) {
            subtitle = "Exclude myself →";
          } else {
            subtitle = isFocused ? "editing ↑" : "tap to edit";
          }

          const handleClick = () => {
            // If payer taps "Exclude myself" label
            if (!isCoverMode && isSelf && isPayer) {
              onExcludeSelf();
              return;
            }
            onFocus(m.id);
          };

          return (
            <button
              key={m.id}
              onClick={handleClick}
              className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 transition-all text-left ${isShaking ? "animate-shake-x" : ""}`}
              style={{
                backgroundColor: isFocused
                  ? isSelf
                    ? "#FFFAF8"
                    : "#FAFCFF"
                  : "#FFFFFF",
                border: `2px solid ${isFocused ? focusColor : "transparent"}`,
                boxShadow: isFocused
                  ? "0 2px 8px rgba(0,0,0,0.08)"
                  : "none",
              }}
            >
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-extrabold text-foreground truncate">
                  {isSelf ? "You" : m.name}
                </p>
                <p className={`text-xs font-semibold ${
                  !isCoverMode && isSelf && isPayer 
                    ? "text-primary" 
                    : "text-muted-foreground"
                }`}>
                  {subtitle}
                </p>
              </div>

              {/* Amount */}
              <div className="flex items-baseline">
                <span className="text-sm font-bold text-muted-foreground mr-0.5">
                  $
                </span>
                <span
                  className="text-[26px] font-extrabold font-sora"
                  style={{
                    color: isFocused ? focusColor : "hsl(var(--foreground))",
                  }}
                >
                  {displayAmount}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
