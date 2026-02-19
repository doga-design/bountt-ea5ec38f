import { Settings, Plus, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { getAvatarColor } from "@/lib/avatar-utils";
import BalancePill from "./BalancePill";

interface DashboardHeaderProps {
  onAddMember?: () => void;
  showBalance?: boolean;
}

export default function DashboardHeader({ onAddMember, showBalance = false }: DashboardHeaderProps) {
  const { currentGroup, groupMembers, user } = useApp();
  const navigate = useNavigate();
  if (!currentGroup) return null;

  const activeMembers = groupMembers.filter((m) => m.status === "active");

  return (
    <div className="relative">
      {/* Orange banner */}
      <div className="bg-primary px-5 pt-5 pb-10">
        {/* Top row: avatars + settings */}
        <div className="flex items-center justify-between mb-6">
          {/* Overlapping avatars */}
          <div className="flex items-center">
            {activeMembers.map((member, i) => {
              const isCurrentUser = member.user_id === user?.id;
              const isPlaceholder = member.is_placeholder;
              const color = isPlaceholder ? undefined : getAvatarColor(member.id);

              return (
                <div
                  key={member.id}
                  className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-primary-foreground"
                  style={{
                    marginLeft: i > 0 ? "-12px" : "0",
                    backgroundColor: isCurrentUser
                      ? "hsl(var(--card))"
                      : isPlaceholder
                      ? "hsl(var(--muted))"
                      : color,
                    zIndex: activeMembers.length - i,
                    position: "relative",
                  }}
                  title={member.name}
                >
                  {isCurrentUser ? (
                    <span className="text-sm">😊</span>
                  ) : isPlaceholder ? (
                    <span className="text-sm">👻</span>
                  ) : (
                    <User className="w-4 h-4 text-primary-foreground" />
                  )}
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

          {/* Settings gear */}
          <button
            className="w-10 h-10 flex items-center justify-center rounded-full"
            aria-label="Group settings"
            onClick={() => navigate(`/groups/${currentGroup.id}/settings`)}
          >
            <Settings className="w-5 h-5 text-primary-foreground" />
          </button>
        </div>

        {/* Bottom row: group name + balance */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary-foreground">
            {currentGroup.name}
          </h1>
          {showBalance && <BalancePill />}
        </div>
      </div>

      {/* Group emoji overlapping bottom edge */}
      <div
        className="absolute left-5 bottom-0 translate-y-1/2 w-14 h-14 rounded-full bg-card flex items-center justify-center text-2xl border-2 border-background z-10"
      >
        {currentGroup.emoji}
      </div>

      {/* Black divider strip */}
      <div className="h-1 bg-secondary w-full" />
    </div>
  );
}
