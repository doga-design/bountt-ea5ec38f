import { Plus } from "lucide-react";
import { GroupMember } from "@/types";

interface MemberChipSelectorProps {
  members: GroupMember[];
  activeIds: Set<string>;
  currentUserId: string | undefined;
  onToggle: (memberId: string) => void;
  onAddPress: () => void;
}

export default function MemberChipSelector({
  members,
  activeIds,
  currentUserId,
  onToggle,
  onAddPress,
}: MemberChipSelectorProps) {
  return (
    <div className="flex flex-nowrap gap-2 px-5 pt-5 pb-2 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
      {members.map((m) => {
        const isSelf = m.user_id === currentUserId;
        const isActive = activeIds.has(m.id);
        const label = isSelf ? "You" : m.name;

        return (
          <button
            key={m.id}
            onClick={() => onToggle(m.id)}
            className="flex items-center rounded-full px-3 py-1.5 text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0"
            style={{
              backgroundColor: isActive
                ? isSelf
                  ? "hsl(var(--primary))"
                  : "hsl(var(--bountt-dark))"
                : "#FFFFFF",
              color: isActive ? "#FFFFFF" : "hsl(var(--foreground))",
              border: isActive ? "none" : "1.5px solid #D4D4D4",
            }}
          >
            {label}
          </button>
        );
      })}
      <button
        onClick={onAddPress}
        className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground whitespace-nowrap flex-shrink-0"
        style={{ border: "1.5px dashed #C4C4C4" }}
      >
        <Plus className="w-3.5 h-3.5" />
        Add
      </button>
    </div>
  );
}
