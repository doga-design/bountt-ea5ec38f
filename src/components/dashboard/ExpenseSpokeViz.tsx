import { useRef, useState, useEffect } from "react";
import { GroupMember } from "@/types";
import { getAvatarColor, getAvatarImage } from "@/lib/avatar-utils";
import { formatCurrency } from "@/lib/bountt-utils";
import { Check } from "lucide-react";

export interface SpokeMember {
  splitId: string;
  name: string;
  userId: string | null;
  shareAmount: number;
  isSettled: boolean;
  member: GroupMember | null;
}

interface ExpenseSpokeVizProps {
  payer: GroupMember | null;
  payerName: string;
  totalAmount: number;
  members: SpokeMember[];
  currentUserId: string;
  isPayer: boolean;
  onMemberTap: (splitId: string, memberName: string, shareAmount: number) => void;
  memberAvatarRef?: (splitId: string, el: HTMLDivElement | null) => void;
}

const PAYER_SIZE = 64;
const MEMBER_SIZE = 48;
const SVG_ARC_HEIGHT = 80;

export default function ExpenseSpokeViz({
  payer,
  payerName,
  totalAmount,
  members,
  currentUserId,
  isPayer,
  onMemberTap,
  memberAvatarRef,
}: ExpenseSpokeVizProps) {
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
  }, [members.length]);

  const count = members.length;
  const payerColor = payer ? getAvatarColor(payer) : "#8B5CF6";
  const payerImg = payer ? getAvatarImage(payer) : undefined;

  const canTap = (m: SpokeMember) => {
    if (m.isSettled) return false;
    if (m.userId === currentUserId) return true;
    if (isPayer && m.userId !== currentUserId) return true;
    return false;
  };

  // Member slot positions (centered row)
  const slotWidth = count > 0 ? containerWidth / count : containerWidth;
  const apexX = containerWidth / 2;

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center w-full py-2 relative"
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(232, 72, 10, 0.04) 0%, transparent 70%)",
      }}
    >
      {/* Payer avatar + label */}
      <div className="flex flex-col items-center z-10">
        <div
          className="rounded-full flex items-center justify-center overflow-hidden"
          style={{
            width: PAYER_SIZE,
            height: PAYER_SIZE,
            backgroundColor: payerColor,
            border: "3px solid white",
            boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
          }}
        >
          {payerImg && (
            <img
              src={payerImg}
              alt={payerName}
              className="w-[75%] h-[75%] object-contain"
              draggable={false}
            />
          )}
        </div>
        <p className="mt-1.5 text-xs text-center">
          <span className="font-medium text-muted-foreground">
            {isPayer ? "You" : payerName} paid
          </span>
          <span className="text-muted-foreground"> · </span>
          <span className="font-bold text-foreground">
            {formatCurrency(totalAmount)}
          </span>
        </p>
      </div>

      {/* SVG arc paths with animated dots */}
      {count >= 1 && containerWidth > 0 && (
        <svg
          style={{
            width: "100%",
            height: SVG_ARC_HEIGHT,
            overflow: "visible",
            pointerEvents: "none",
          }}
        >
          {members.map((m, i) => {
            const endX = slotWidth * i + slotWidth / 2;
            const endY = SVG_ARC_HEIGHT;
            const ctrlX = endX;
            const ctrlY = 0;
            const d = `M ${apexX} 0 Q ${ctrlX} ${ctrlY} ${endX} ${endY}`;
            const dur = `${1.2 + (i * 0.3) % 1.2}s`;
            const begin = `${i * 0.4}s`;

            return (
              <g key={i} opacity={m.isSettled ? 0.3 : 1}>
                <path
                  d={d}
                  stroke="#D4D4D4"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  fill="none"
                />
                {!m.isSettled && (
                  <circle r="4" fill="#D4D4D4">
                    <animateMotion
                      path={d}
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
                )}
              </g>
            );
          })}
        </svg>
      )}

      {/* Member avatars row */}
      <div className="flex justify-center w-full z-10" style={{ gap: 8 }}>
        {members.map((m) => {
          const memberColor = m.member ? getAvatarColor(m.member) : "#8B5CF6";
          const memberImg = m.member ? getAvatarImage(m.member) : undefined;
          const tappable = canTap(m);
          const isMe = m.userId === currentUserId;
          const label = isMe ? "You" : m.name;

          return (
            <div
              key={m.splitId}
              className="flex flex-col items-center"
              style={{ width: Math.max(MEMBER_SIZE, Math.min(72, slotWidth - 8)) }}
            >
              <div
                ref={(el) => memberAvatarRef?.(m.splitId, el)}
                onClick={() =>
                  tappable && onMemberTap(m.splitId, m.name, m.shareAmount)
                }
                className={`relative rounded-full flex items-center justify-center overflow-hidden ${
                  tappable
                    ? "cursor-pointer active:scale-95 transition-transform"
                    : "cursor-default"
                } ${m.isSettled ? "opacity-60" : ""}`}
                style={{
                  width: MEMBER_SIZE,
                  height: MEMBER_SIZE,
                  backgroundColor: memberColor,
                  border: "3px solid white",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                }}
              >
                {memberImg && (
                  <img
                    src={memberImg}
                    alt={m.name}
                    className="w-[75%] h-[75%] object-contain"
                    draggable={false}
                  />
                )}

                {m.isSettled && (
                  <div
                    className="absolute -top-1 -right-1 rounded-full flex items-center justify-center bg-foreground"
                    style={{ width: 18, height: 18 }}
                  >
                    <Check className="w-3 h-3 text-background" />
                  </div>
                )}
              </div>

              <span className="text-[10px] font-medium text-muted-foreground mt-1 text-center leading-tight max-w-[72px] break-words">
                {m.isSettled ? `${label} settled` : `${label}'s share`}
              </span>
              <span className="text-[11px] font-bold text-foreground">
                {formatCurrency(m.shareAmount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
