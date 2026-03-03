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
  // Dynamic sizing based on member count
  const count = members.length + 1; // +1 for the "+" button
  const avatarSize = count <= 3 ? 72 : count <= 5 ? 64 : count <= 7 ? 56 : 48;
  const fontSize = count <= 3 ? 13 : count <= 5 ? 12 : 11;

  return (
    <div className="flex items-start gap-3 px-4 py-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
      {members.map((m) => {
        const isActive = activeIds.has(m.id);
        const color = getAvatarColor(m);
        const isSelf = m.user_id === currentUserId;
        const avatarImg = getAvatarImage(m);

        return (
          <button
            key={m.id}
            onClick={() => onToggle(m.id)}
            className="flex flex-col items-center flex-shrink-0 transition-all active:scale-95"
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

      {/* "+" button (visual only) */}
      <div
        className="flex flex-col items-center flex-shrink-0"
        style={{ width: avatarSize + 8 }}
      >
        <div
          className="rounded-full flex items-center justify-center border-2 border-dashed"
          style={{
            width: avatarSize,
            height: avatarSize,
            borderColor: "hsl(var(--border))",
          }}
        >
          <Plus className="text-muted-foreground" style={{ width: avatarSize * 0.35, height: avatarSize * 0.35 }} />
        </div>
        <span
          className="mt-1 font-bold text-muted-foreground text-center"
          style={{ fontSize }}
        >
          Add
        </span>
      </div>
    </div>
  );
}
