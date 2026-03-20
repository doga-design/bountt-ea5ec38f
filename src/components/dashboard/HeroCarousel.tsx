import { Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { useHeroData } from "./slides/useHeroData";
import { getGroupIconSrc } from "@/lib/group-icon-utils";
import { formatCurrency } from "@/lib/bountt-utils";

const GRADIENTS: Record<string, { from: string; to: string }> = {
  "solid-orange": { from: "hsl(18,89%,47%)", to: "hsl(18,89%,47%)" },
  "orange-red": { from: "hsl(15,90%,55%)", to: "hsl(0,85%,50%)" },
  "blue-purple": { from: "hsl(220,80%,55%)", to: "hsl(270,70%,55%)" },
  "green-teal": { from: "hsl(150,60%,45%)", to: "hsl(180,70%,45%)" },
  "pink-orange": { from: "hsl(330,80%,60%)", to: "hsl(25,90%,55%)" },
  "gray-black": { from: "hsl(0,0%,40%)", to: "hsl(0,0%,15%)" },
};

export default function HeroCarousel() {
  const { currentGroup } = useApp();
  const navigate = useNavigate();
  const { netBalance } = useHeroData();

  if (!currentGroup) return null;

  const gradient = GRADIENTS[currentGroup.banner_gradient] ?? GRADIENTS["orange-red"];
  const bgStyle = {
    background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
  };

  const label =
    netBalance > 0 ? "you're up" : netBalance < 0 ? "you owe" : "all settled";

  const absBalance = Math.abs(netBalance);
  const displayAmount =
    absBalance === 0
      ? "$0"
      : Number.isInteger(absBalance)
        ? `$${absBalance}`
        : formatCurrency(absBalance);

  return (
    <div className="relative overflow-hidden" style={bgStyle}>
      {/* Nav bar with darker tint */}
      <div className="relative z-10">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <img
              src={getGroupIconSrc(currentGroup.emoji)}
              alt=""
              className="w-6 h-6"
            />
            <h1 className="text-lg font-bold text-white">{currentGroup.name}</h1>
          </div>
          <button
            className="w-10 h-10 flex items-center justify-center rounded-full"
            aria-label="Group settings"
            onClick={() => navigate(`/groups/${currentGroup.id}/settings`)}
          >
            <Settings className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Single balance display */}
      <div className="flex flex-col items-center justify-center px-6 py-8 min-h-[180px]">
        <span className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-2">
          {label}
        </span>
        <span className="text-5xl font-extrabold text-white">
          {displayAmount}
        </span>
      </div>
    </div>
  );
}
