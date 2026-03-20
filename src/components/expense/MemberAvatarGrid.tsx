import { useRef, useState, useEffect } from "react";
import { GroupMember } from "@/types";
import { getAvatarColor, getAvatarImage } from "@/lib/avatar-utils";
import { Plus } from "lucide-react";

interface MemberAvatarGridProps {
  members: GroupMember[];
  activeIds: Set<string>;
  onToggle: (memberId: string) => void;
  currentUserId: string | undefined;
  onAddMember?: () => void;
  splitAmounts?: Map<string, number>;
}

function getSizingTier(memberCount: number) {
  if (memberCount <= 2) return { avatarSize: 100, fontSize: 18, gap: 16, verticalSpacing: 10 };
  if (memberCount <= 3) return { avatarSize: 92, fontSize: 18, gap: 14, verticalSpacing: 8 };
  if (memberCount <= 4) return { avatarSize: 75, fontSize: 16, gap: 12, verticalSpacing: 6 };
  if (memberCount <= 5) return { avatarSize: 60, fontSize: 15, gap: 10, verticalSpacing: 6 };
  return { avatarSize: 48, fontSize: 13, gap: 8, verticalSpacing: 4 };
}

const SVG_HEIGHT = 60;

export default function MemberAvatarGrid({
  members,
  activeIds,
  onToggle,
  currentUserId,
  onAddMember,
  splitAmounts,
}: MemberAvatarGridProps) {
  const memberCount = members.length;
  const { avatarSize, fontSize, gap, verticalSpacing } = getSizingTier(memberCount);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setContainerWidth(el.offsetWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [memberCount]);

  // Spoke calculations
  const apexX = containerWidth / 2;
  const totalSlots = memberCount;
  const slotWidth = containerWidth / totalSlots;

  return (
    <div className="relative px-4" ref={containerRef} style={{ paddingTop: SVG_HEIGHT }}>
      {/* Multi-spoke dashed arc SVG */}
      {memberCount >= 2 && containerWidth > 0 && (
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: SVG_HEIGHT,
            overflow: "visible",
            pointerEvents: "none",
          }}
        >
          {members.map((m, i) => {
            if (!activeIds.has(m.id)) return null;
            const endX = slotWidth * i + slotWidth / 2;
            const endY = SVG_HEIGHT;
            const ctrlX = endX;
            const ctrlY = 0;
            const d = `M ${apexX} 0 Q ${ctrlX} ${ctrlY} ${endX} ${endY}`;
            // Reversed path for animation: bottom (member) → top (payer)
            const dReversed = `M ${endX} ${endY} Q ${ctrlX} ${ctrlY} ${apexX} 0`;
            const dur = `${1.2 + (i * 0.3) % 1.2}s`;
            const begin = `${i * 0.4}s`;

            return (
              <g key={i}>
                <path
                  d={d}
                  stroke="#D4D4D4"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  fill="none"
                />
                <circle r="4" fill="#D4D4D4">
                  <animateMotion
                    path={dReversed}
                    dur={dur}
                    begin={begin}
                    repeatCount="indefinite"
                    calcMode="spline"
                    keySplines="0.4 0 0.6 1"
                    keyTimes="0;1"
                  />
                  <animate
                    attributeName="opacity"
                    values="1;1;0"
                    keyTimes="0;0.7;1"
                    dur={dur}
                    begin={begin}
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            );
          })}
        </svg>
      )}

      {/* Avatar row */}
      <div
        className="flex justify-center relative"
        style={{ gap, paddingTop: verticalSpacing, paddingBottom: verticalSpacing }}
      >
        {members.map((m) => {
          const isActive = activeIds.has(m.id);
          const { bg, stroke } = getAvatarColor(m);
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
                  backgroundColor: isActive ? bg : "#E0E0DC",
                  border: isActive ? `3px solid ${stroke}` : "3px solid white",
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
                {isActive && splitAmounts?.has(m.id) && (
                  <span style={{ color: "hsl(var(--muted-foreground))", fontWeight: 500 }}>
                    {" · $"}
                    {(() => {
                      const val = splitAmounts.get(m.id)!;
                      return val % 1 === 0 ? val.toFixed(0) : val.toFixed(2);
                    })()}
                  </span>
                )}
              </span>
            </button>
          );
        })}
        {onAddMember && (
          <button
            onClick={onAddMember}
            className="absolute flex items-center justify-center rounded-full"
            style={{
              width: 36,
              height: 36,
              top: '50%',
              right: -18,
              transform: 'translateY(-50%)',
              zIndex: 10,
              backgroundColor: 'white',
              border: '1.5px solid #E2E2DE',
              boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            }}
            aria-label="Add member"
          >
            <Plus className="w-[18px] h-[18px]" style={{ color: '#888' }} />
          </button>
        )}
      </div>
    </div>
  );
}
