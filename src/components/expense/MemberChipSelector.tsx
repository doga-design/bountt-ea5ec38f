import { Plus } from "lucide-react";
import { GroupMember } from "@/types";
import { getAvatarColor } from "@/lib/avatar-utils";

interface MemberChipSelectorProps {
  members: GroupMember[];
  activeIds: Set<string>;
  currentUserId: string | undefined;
  onToggle: (memberId: string) => void;
  onAddPress: () => void;
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function MemberChipSelector({
  members,
  activeIds,
  currentUserId,
  onToggle,
  onAddPress,
}: MemberChipSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2 px-5 pt-5 pb-2">
      {members.map((m) => {
        const isSelf = m.user_id === currentUserId;
        const isActive = activeIds.has(m.id);
        const color = getAvatarColor(m);
        const label = isSelf ? "You" : m.name;

        return (
          <button
            key={m.id}
            onClick={() => onToggle(m.id)}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-all"
            style={{
              backgroundColor: isActive
                ? isSelf
                  ? "hsl(var(--primary))"
                  : "hsl(var(--bountt-dark))"
                : "#FFFFFF",
              color: isActive ? "#FFFFFF" : "#A0A0A0",
              border: isActive ? "none" : "1.5px solid #D4D4D4",
            }}
          >
            <span
              className="w-[22px] h-[22px] rounded-md flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
              style={{ backgroundColor: color }}
            >
              {getInitials(m.name)}
            </span>
            {label}
          </button>
        );
      })}
      <button
        onClick={onAddPress}
        className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground"
        style={{ border: "1.5px dashed #C4C4C4" }}
      >
        <Plus className="w-3.5 h-3.5" />
        Add
      </button>
    </div>
  );
}
