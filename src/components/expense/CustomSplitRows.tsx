import { GroupMember } from "@/types";
import { getAvatarColor, getAvatarImage } from "@/lib/avatar-utils";

interface CustomSplitRowsProps {
  members: GroupMember[];
  currentUserId: string | undefined;
  customAmounts: Map<string, string>;
  focusedMemberId: string | null;
  shakeMemberId: string | null;
  onFocus: (memberId: string) => void;
  visible: boolean;
}

export default function CustomSplitRows({
  members,
  currentUserId,
  customAmounts,
  focusedMemberId,
  shakeMemberId,
  onFocus,
  visible,
}: CustomSplitRowsProps) {
  if (!visible) return null;

  return (
    <div className="px-4 py-2">
      {members.map((m, idx) => {
        const isSelf = m.user_id === currentUserId;
        const isFocused = focusedMemberId === m.id;
        const isShaking = shakeMemberId === m.id;
        const color = getAvatarColor(m);
        const avatarImg = getAvatarImage(m);
        const amountStr = customAmounts.get(m.id) ?? "0";
        const displayAmount = amountStr === "0" ? "0" : amountStr;

        return (
          <div key={m.id}>
            <button
              onClick={() => onFocus(m.id)}
              className={`w-full flex items-center gap-4 py-3 transition-all ${isShaking ? "animate-shake-x" : ""}`}
            >
              {/* Avatar */}
              <div className="flex flex-col items-center flex-shrink-0" style={{ width: 72 }}>
                <div
                  className="rounded-full flex items-center justify-center overflow-hidden"
                  style={{
                    width: 64,
                    height: 64,
                    backgroundColor: color,
                    border: isFocused ? "3px solid white" : "3px solid transparent",
                    boxShadow: isFocused ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
                  }}
                >
                  <img
                    src={avatarImg}
                    alt={m.name}
                    className="w-[75%] h-[75%] object-contain"
                    draggable={false}
                  />
                </div>
                <span
                  className="mt-1 text-xs font-bold truncate w-full text-center"
                  style={{
                    color: isSelf ? "#D94F00" : "hsl(var(--foreground))",
                  }}
                >
                  {isSelf ? "You" : m.name}
                </span>
              </div>

              {/* Amount box */}
              <div
                className="flex-1 flex items-center justify-end rounded-2xl px-4 py-3 transition-all"
                style={{
                  backgroundColor: isFocused
                    ? isSelf ? "#FFFAF8" : "#F0F4FF"
                    : "hsl(var(--card))",
                  border: `2px solid ${isFocused ? (isSelf ? "#D94F00" : "#2563EB") : "hsl(var(--border))"}`,
                  boxShadow: isFocused ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                }}
              >
                <div className="flex items-baseline">
                  <span className="text-sm font-bold text-muted-foreground mr-0.5">$</span>
                  <span
                    className="text-[26px] font-extrabold font-sora"
                    style={{
                      color: isFocused
                        ? isSelf ? "#D94F00" : "#2563EB"
                        : "hsl(var(--foreground))",
                    }}
                  >
                    {displayAmount}
                  </span>
                  {isFocused && (
                    <span
                      className="w-[2px] h-[22px] rounded-full ml-0.5 animate-blink"
                      style={{ backgroundColor: isSelf ? "#D94F00" : "#2563EB" }}
                    />
                  )}
                </div>
              </div>
            </button>
            {idx < members.length - 1 && (
              <div className="border-t border-border/50 mx-2" />
            )}
          </div>
        );
      })}
    </div>
  );
}
