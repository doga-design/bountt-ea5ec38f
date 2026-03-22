import { Settings, Plus, ChevronDown, CircleUser } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { getAvatarColor, getAvatarImage } from "@/lib/avatar-utils";
import BalancePill from "./BalancePill";
import { getGroupIconSrc } from "@/lib/group-icon-utils";
import { getBackgroundSrc } from "@/lib/background-utils";

interface DashboardHeaderProps {
  onAddMember?: () => void;
  showBalance?: boolean;
}

export default function DashboardHeader({ onAddMember, showBalance = false }: DashboardHeaderProps) {
  const { currentGroup, groupMembers, user } = useApp();
  const navigate = useNavigate();
  if (!currentGroup) return null;

  const activeMembers = groupMembers.filter((m) => m.status === "active");
  const bgSrc = getBackgroundSrc(currentGroup.banner_gradient);

  return (
    <div className="relative">
      {/* Banner */}
      <div
        className="px-5 pt-5 pb-10"
        style={{
          backgroundImage: `url(${bgSrc})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Top row: avatars + settings */}
        <div className="flex items-center justify-between mb-6">
          {/* Overlapping avatars */}
          <div className="flex items-center">
            {activeMembers.map((member, i) => {
              const isCurrentUser = member.user_id === user?.id;
              const { bg } = getAvatarColor(member);

              return (
                <div
                  key={member.id}
                  className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-primary-foreground overflow-hidden"
                  style={{
                    marginLeft: i > 0 ? "-12px" : "0",
                    backgroundColor: isCurrentUser ? "hsl(var(--card))" : bg,
                    zIndex: activeMembers.length - i,
                    position: "relative",
                  }}
                  title={member.name}
                >
                  <img
                    src={getAvatarImage(member)}
                    alt={member.name}
                    className="w-[75%] h-[75%] object-contain"
                    draggable={false}
                  />
                </div>
              );
            })}
            {onAddMember && (
              <button
                onClick={onAddMember}
                className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center border-2 border-primary-foreground relative"
                style={{ marginLeft: activeMembers.length > 0 ? "-12px" : "0", zIndex: 0 }}
                aria-label="Add member"
              >
                <Plus className="w-4 h-4 text-primary-foreground" />
              </button>
            )}
          </div>

          {/* Profile + Settings */}
          <div className="flex items-center gap-1">
            <button
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/15 backdrop-blur-sm"
              aria-label="Profile"
              onClick={() => navigate("/profile")}
            >
              <CircleUser className="w-6 h-6 text-primary-foreground" />
            </button>
            <button
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/15 backdrop-blur-sm"
              aria-label="Group settings"
              onClick={() => navigate(`/groups/${currentGroup.id}/settings`)}
            >
              <Settings className="w-5 h-5 text-primary-foreground" />
            </button>
          </div>
        </div>

        {/* Bottom row: group name + balance */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/groups")}
            className="flex items-center gap-1"
          >
            <h1 className="text-2xl font-bold text-primary-foreground">{currentGroup.name}</h1>
            <ChevronDown className="w-4 h-4 text-primary-foreground" />
          </button>
          {showBalance && <BalancePill />}
        </div>
      </div>

      {/* Group icon overlapping bottom edge */}
      <div className="absolute left-5 bottom-0 translate-y-1/2 w-14 h-14 rounded-full bg-card flex items-center justify-center border-2 border-background z-10">
        <img src={getGroupIconSrc(currentGroup.emoji)} alt="" className="w-8 h-8" />
      </div>
    </div>
  );
}
