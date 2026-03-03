import { GroupMember } from "@/types";
import { getAvatarColor, getAvatarImage } from "@/lib/avatar-utils";

interface MemberAvatarGridProps {
  members: GroupMember[];
  activeIds: Set<string>;
  onToggle: (memberId: string) => void;
  currentUserId: string | undefined;
}

function getSizingTier(memberCount: number) {
  if (memberCount <= 2) return { avatarSize: 100, fontSize: 18, gap: 16, verticalSpacing: 10 };
  if (memberCount <= 3) return { avatarSize: 92, fontSize: 18, gap: 14, verticalSpacing: 8 };
  if (memberCount <= 4) return { avatarSize: 75, fontSize: 16, gap: 12, verticalSpacing: 6 };
  if (memberCount <= 5) return { avatarSize: 60, fontSize: 15, gap: 10, verticalSpacing: 6 };
  return { avatarSize: 48, fontSize: 13, gap: 8, verticalSpacing: 4 };
}

export default function MemberAvatarGrid({
  members,
  activeIds,
  onToggle,
  currentUserId,
}: MemberAvatarGridProps) {
  const memberCount = members.length;
  const { avatarSize, fontSize, gap, verticalSpacing } = getSizingTier(memberCount);

  // Dashed arc SVG dimensions — spans member avatars only
  const totalWidth = memberCount * avatarSize + (memberCount - 1) * gap;
  const arcHeight = 24;

  return (
    <div className="relative px-4" style={{ paddingTop: arcHeight + 4 }}>
      {/* Dashed arc SVG */}
      {memberCount >= 2 && (
        <svg
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: 0 }}
          width={totalWidth}
          height={arcHeight}
          viewBox={`0 0 ${totalWidth} ${arcHeight}`}
          fill="none"
        >
          <path
            d={`M ${avatarSize / 2} ${arcHeight} Q ${totalWidth / 2} ${-arcHeight * 0.6} ${totalWidth - avatarSize / 2} ${arcHeight}`}
            stroke="#D4D4D4"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            fill="none"
          />
        </svg>
      )}

      {/* Avatar row */}
      <div
        className="flex justify-center"
        style={{ gap, paddingTop: verticalSpacing, paddingBottom: verticalSpacing }}
      >
        {members.map((m) => {
          const isActive = activeIds.has(m.id);
          const color = getAvatarColor(m);
          const isSelf = m.user_id === currentUserId;
          const avatarImg = getAvatarImage(m);

          return (
            <button
              key={m.id}
              onClick={() => onToggle(m.id)}
              className="flex flex-col items-center transition-all active:scale-95"
              style={{ width: avatarSize }}
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
      </div>
    </div>
  );
}
