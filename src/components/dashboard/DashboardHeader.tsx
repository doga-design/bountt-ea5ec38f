import { Settings, Plus, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import BalancePill from "./BalancePill";

interface DashboardHeaderProps {
  onAddMember?: () => void;
  showBalance?: boolean;
}

export default function DashboardHeader({ onAddMember, showBalance = false }: DashboardHeaderProps) {
  const { currentGroup, groupMembers, user } = useApp();
  const navigate = useNavigate();
  if (!currentGroup) return null;

  return (
    <div className="bg-primary rounded-b-3xl px-5 pt-6 pb-8">
      {/* Top row: settings */}
      <div className="flex justify-end mb-4">
        <button
          className="w-11 h-11 flex items-center justify-center rounded-full bg-primary-foreground/10"
          aria-label="Group settings"
          onClick={() => navigate(`/groups/${currentGroup.id}/settings`)}
        >
          <Settings className="w-5 h-5 text-primary-foreground" />
        </button>
      </div>

      {/* Group emoji avatar */}
      <div className="flex flex-col items-center gap-3 mb-4">
        <div className="w-16 h-16 rounded-full bg-primary-foreground flex items-center justify-center text-3xl">
          {currentGroup.emoji}
        </div>

        {/* Member avatars row */}
        <div className="flex items-center gap-1">
          {groupMembers.map((member) => (
            <div
              key={member.id}
              className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center border-2 border-primary -ml-1 first:ml-0"
              title={member.name}
            >
              {member.user_id === user?.id ? (
                <span className="text-xs">😊</span>
              ) : (
                <User className="w-4 h-4 text-primary-foreground/70" />
              )}
            </div>
          ))}
          {onAddMember && (
            <button
              onClick={onAddMember}
              className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center border-2 border-primary -ml-1"
              aria-label="Add member"
            >
              <Plus className="w-4 h-4 text-primary-foreground" />
            </button>
          )}
        </div>

        {/* Group name + balance */}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-primary-foreground">
            {currentGroup.name}
          </h1>
          {showBalance && <BalancePill />}
        </div>
      </div>
    </div>
  );
}
