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
  /** Ref callback so parent can get avatar DOM positions for popover anchoring */
  memberAvatarRef?: (splitId: string, el: HTMLDivElement | null) => void;
}

const PAYER_SIZE = 56;
const MEMBER_SIZE = 48;
const ARC_DEGREES = 160;
const ARC_START_DEG = (180 - ARC_DEGREES) / 2 + 180; // center the arc below payer
const DEG_TO_RAD = Math.PI / 180;

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
  const count = members.length;
  // Radius scales: at 320px min width, ensure no overlap for 6 members
  const radius = Math.max(90, Math.min(120, 300 / (count + 1)));
  const centerX = 50; // percentage

  // SVG viewBox dimensions
  const svgWidth = 300;
  const svgHeight = radius + MEMBER_SIZE / 2 + 30;
  const payerCx = svgWidth / 2;
  const payerCy = PAYER_SIZE / 2 + 4;

  // Calculate member positions on the arc
  const memberPositions = members.map((_, i) => {
    const angleDeg =
      count === 1
        ? 270 // straight down
        : ARC_START_DEG + (ARC_DEGREES / (count - 1)) * i;
    const angleRad = angleDeg * DEG_TO_RAD;
    const x = payerCx + radius * Math.cos(angleRad);
    const y = payerCy + radius * Math.sin(angleRad);
    return { x, y };
  });

  const payerColor = payer ? getAvatarColor(payer) : "#8B5CF6";
  const payerImg = payer ? getAvatarImage(payer) : undefined;

  const canTap = (m: SpokeMember) => {
    if (m.isSettled) return false;
    if (m.userId === currentUserId) return true;
    if (isPayer && m.userId !== currentUserId) return true;
    return false;
  };

  return (
    <div className="flex flex-col items-center w-full py-2">
      {/* Payer label */}
      <p className="text-xs font-semibold text-muted-foreground mb-1">
        {isPayer ? "You" : payerName} paid · {formatCurrency(totalAmount)}
      </p>

      <div className="relative w-full" style={{ maxWidth: svgWidth, height: svgHeight + 60 }}>
        {/* Dashed lines SVG */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`0 0 ${svgWidth} ${svgHeight + 60}`}
          fill="none"
          style={{ pointerEvents: "none" }}
        >
          {memberPositions.map((pos, i) => (
            <line
              key={i}
              x1={payerCx}
              y1={payerCy}
              x2={pos.x}
              y2={pos.y}
              stroke="hsl(var(--border))"
              strokeWidth={1.5}
              strokeDasharray="6 4"
              opacity={members[i].isSettled ? 0.3 : 0.6}
            />
          ))}
        </svg>

        {/* Payer avatar */}
        <div
          className="absolute rounded-full flex items-center justify-center border-2 border-card"
          style={{
            width: PAYER_SIZE,
            height: PAYER_SIZE,
            backgroundColor: payerColor,
            left: `calc(50% - ${PAYER_SIZE / 2}px)`,
            top: 4,
            zIndex: 10,
          }}
        >
          {payerImg && (
            <img src={payerImg} alt={payerName} className="w-full h-full rounded-full object-cover" />
          )}
        </div>

        {/* Member avatars */}
        {members.map((m, i) => {
          const pos = memberPositions[i];
          const memberColor = m.member ? getAvatarColor(m.member) : "#8B5CF6";
          const memberImg = m.member ? getAvatarImage(m.member) : undefined;
          const tappable = canTap(m);
          const isMe = m.userId === currentUserId;
          const label = isMe ? "You" : m.name;

          return (
            <div
              key={m.splitId}
              className="absolute flex flex-col items-center"
              style={{
                left: pos.x - MEMBER_SIZE / 2,
                top: pos.y - MEMBER_SIZE / 2,
                zIndex: 10,
              }}
            >
              {/* Avatar circle */}
              <div
                ref={(el) => memberAvatarRef?.(m.splitId, el)}
                onClick={() => tappable && onMemberTap(m.splitId, m.name, m.shareAmount)}
                className={`relative rounded-full flex items-center justify-center border-2 border-card ${
                  tappable ? "cursor-pointer active:scale-95 transition-transform" : "cursor-default"
                } ${m.isSettled ? "opacity-60" : ""}`}
                style={{
                  width: MEMBER_SIZE,
                  height: MEMBER_SIZE,
                  backgroundColor: memberColor,
                }}
              >
                {memberImg && (
                  <img src={memberImg} alt={m.name} className="w-full h-full rounded-full object-cover" />
                )}

                {/* Settled checkmark badge */}
                {m.isSettled && (
                  <div
                    className="absolute -top-1 -right-1 rounded-full flex items-center justify-center bg-foreground"
                    style={{ width: 18, height: 18 }}
                  >
                    <Check className="w-3 h-3 text-background" />
                  </div>
                )}
              </div>

              {/* Label below avatar */}
              <span className="text-[10px] font-medium text-muted-foreground mt-1 text-center leading-tight max-w-[64px] truncate">
                {m.isSettled ? `${label} settled` : `${label}'s share`}
              </span>
              <span className="text-[10px] font-semibold text-foreground">
                {formatCurrency(m.shareAmount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
