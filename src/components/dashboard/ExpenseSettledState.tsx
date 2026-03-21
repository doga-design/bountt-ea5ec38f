import { GroupMember } from "@/types";
import { getAvatarColor, getAvatarImage } from "@/lib/avatar-utils";
import { Check } from "lucide-react";

interface SettledMember {
  name: string;
  member: GroupMember | null;
}

interface ExpenseSettledStateProps {
  members: SettledMember[];
}

export default function ExpenseSettledState({ members }: ExpenseSettledStateProps) {
  return (
    <div className="flex flex-col items-center py-6 gap-4">
      {/* Large checkmark circle — dark navy / foreground, NOT green */}
      <div
        className="rounded-full flex items-center justify-center bg-foreground"
        style={{ width: 80, height: 80 }}
      >
        <Check className="w-10 h-10 text-background" strokeWidth={3} />
      </div>

      <p className="text-lg font-bold text-foreground font-sans">All settled up!</p>

      {/* Overlapping avatar stack */}
      <div className="flex items-center justify-center">
        {members.map((m, i) => {
          const color = m.member ? getAvatarColor(m.member).bg : '#B984E5';
          const img = m.member ? getAvatarImage(m.member) : undefined;

          return (
            <div
              key={m.name + i}
              className={`rounded-full flex items-center justify-center border-2 border-card ${i > 0 ? "-ml-3" : ""}`}
              style={{
                width: 40,
                height: 40,
                backgroundColor: color,
                zIndex: members.length - i,
              }}
            >
              {img && (
                <img src={img} alt={m.name} className="w-full h-full rounded-full object-cover" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
