import { Plus } from "lucide-react";
import { GroupMember } from "@/types";
import { getAvatarColor, getAvatarImage } from "@/lib/avatar-utils";

interface MemberAvatarGridProps {
  members: GroupMember[];
  activeIds: Set<string>;
  onToggle: (memberId: string) => void;
  currentUserId: string | undefined;
}

export default function MemberAvatarGrid({
  members,
  activeIds,
  onToggle,
  currentUserId,
}: MemberAvatarGridProps) {
  const count = members.length;
  const avatarSize = count <= 3 ? 72 : count <= 5 ? 64 : count <= 7 ? 56 : 48;
  const fontSize = count <= 3 ? 13 : count <= 5 ? 12 : 11;
  const plusSize = 24;

  return (
    <div className="flex items-start gap-3 px-4 py-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
      {members.map((m, idx) => {
        const isActive = activeIds.has(m.id);
        const color = getAvatarColor(m);
        const isSelf = m.user_id === currentUserId;
        const avatarImg = getAvatarImage(m);
        const isLast = idx === members.length - 1;

        return (
          <button
            key={m.id}
            onClick={() => onToggle(m.id)}
            className="flex flex-col items-center flex-shrink-0 transition-all active:scale-95 relative"
            style={{ width: avatarSize + 8 }}
          >
            <div
              className="rounded-full flex items-center justify-center transition-all overflow-hidden"
              style={{
                width: avatarSize,
                height: avatarSize,
                backgroundColor: isActive ? color : "#E0E0DC",
                border: isActive ? "3px solid white" : "3px solid transparent",
                boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
                filter: isActive ? "none" : "grayscale(100%)",
                opacity: isActive ? 1 : 0.5,
              }}
            >
              <img
                src={avatarImg}
                alt={m.name}
                className="w-[75%] h-[75%] object-contain"
                draggable={false}
              />
            </div>
            {/* "+" overlay on last member avatar */}
            {isLast && (
              <div
                className="absolute flex items-center justify-center rounded-full border-2 border-card"
                style={{
                  width: plusSize,
                  height: plusSize,
                  top: -2,
                  right: 0,
                  backgroundColor: "#EAEAE6",
                }}
              >
                <Plus className="text-muted-foreground" style={{ width: 14, height: 14 }} strokeWidth={2.5} />
              </div>
            )}
            <span
              className="mt-1 font-bold text-center truncate w-full"
              style={{
                fontSize,
                color: isActive
                  ? isSelf
                    ? "hsl(var(--primary))"
                    : "hsl(var(--foreground))"
                  : "hsl(var(--muted-foreground))",
              }}
            >
              {isSelf ? "You" : m.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
