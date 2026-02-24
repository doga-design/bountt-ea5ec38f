import { GroupMember } from "@/types";
import { getAvatarColor } from "@/lib/avatar-utils";

interface CustomSplitRowsProps {
  members: GroupMember[];
  currentUserId: string | undefined;
  customAmounts: Map<string, string>;
  focusedMemberId: string | null;
  onFocus: (memberId: string) => void;
  visible: boolean;
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function CustomSplitRows({
  members,
  currentUserId,
  customAmounts,
  focusedMemberId,
  onFocus,
  visible,
}: CustomSplitRowsProps) {
  return (
    <div
      className="px-5 overflow-hidden transition-all duration-300"
      style={{
        maxHeight: visible ? `${members.length * 80}px` : "0px",
        opacity: visible ? 1 : 0,
      }}
    >
      <div className="space-y-1.5 py-2">
        {members.map((m) => {
          const isSelf = m.user_id === currentUserId;
          const isFocused = focusedMemberId === m.id;
          const color = getAvatarColor(m);
          const amountStr = customAmounts.get(m.id) ?? "0";
          const displayAmount = amountStr === "0" ? "0" : amountStr;

          const focusColor = isSelf ? "hsl(var(--primary))" : "#3B82F6";

          return (
            <button
              key={m.id}
              onClick={() => onFocus(m.id)}
              className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 transition-all text-left"
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
              {/* Avatar */}
              <span
                className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ backgroundColor: color }}
              >
                {getInitials(m.name)}
              </span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-extrabold text-foreground truncate">
                  {isSelf ? "You" : m.name}
                </p>
                <p className="text-xs font-semibold text-muted-foreground">
                  {isFocused ? "editing ↑" : "tap to edit"}
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
