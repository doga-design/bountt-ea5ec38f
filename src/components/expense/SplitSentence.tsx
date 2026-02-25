import { useState } from "react";
import { Check } from "lucide-react";
import { GroupMember } from "@/types";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface SplitSentenceProps {
  splitMode: "equal" | "custom";
  onToggleMode: () => void;
  activeMembers: GroupMember[];
  currentUserId: string | undefined;
  disabled: boolean;
  isSingleUser?: boolean;
  payerMember: GroupMember | undefined;
  onCyclePayer: () => void;
  // New props for member management
  allActiveMembers: GroupMember[];
  activeIds: Set<string>;
  onToggleMember: (memberId: string) => void;
}

export default function SplitSentence({
  splitMode,
  onToggleMode,
  activeMembers,
  currentUserId,
  disabled,
  isSingleUser = false,
  payerMember,
  onCyclePayer,
  allActiveMembers,
  activeIds,
  onToggleMember,
}: SplitSentenceProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  if (isSingleUser) {
    return (
      <p className="text-center text-sm font-semibold text-muted-foreground px-6 opacity-40">
        assigning a split
      </p>
    );
  }

  const payerIsYou = payerMember?.user_id === currentUserId;
  const payerDisplay = payerIsYou ? "You" : payerMember?.name ?? "You";

  // "with" list: everyone in the split except the payer
  const others = activeMembers.filter((m) => m.id !== payerMember?.id);

  const isEqual = splitMode === "equal";

  const renderName = (member: GroupMember) => {
    const label = member.user_id === currentUserId ? "you" : member.name;
    return (
      <button
        key={member.id}
        onClick={() => setSheetOpen(true)}
        className="font-bold text-foreground underline decoration-dotted underline-offset-4 active:opacity-50 transition-opacity"
        disabled={disabled}
      >
        {label}
      </button>
    );
  };

  let namesDisplay: React.ReactNode;
  if (others.length === 0) {
    namesDisplay = (
      <button
        onClick={() => setSheetOpen(true)}
        className="font-bold text-foreground underline decoration-dotted underline-offset-4 active:opacity-50 transition-opacity"
        disabled={disabled}
      >
        yourself
      </button>
    );
  } else if (others.length === 1) {
    namesDisplay = renderName(others[0]);
  } else if (others.length === 2) {
    namesDisplay = (
      <>
        {renderName(others[0])}
        {" & "}
        {renderName(others[1])}
      </>
    );
  } else {
    namesDisplay = (
      <>
        {others.slice(0, -1).map((m, i) => (
          <span key={m.id}>
            {renderName(m)}
            {i < others.length - 2 ? ", " : ""}
          </span>
        ))}
        {" & "}
        {renderName(others[others.length - 1])}
      </>
    );
  }

  return (
    <>
      <p
        className={`text-center text-sm font-semibold text-muted-foreground px-6 ${
          disabled ? "opacity-40 pointer-events-none" : ""
        }`}
      >
        <button
          onClick={onCyclePayer}
          className="font-extrabold underline decoration-dotted underline-offset-4 text-foreground"
          disabled={disabled}
        >
          {payerDisplay}
        </button>
        {" paid, splitting "}
        <button
          onClick={onToggleMode}
          className="font-extrabold underline decoration-dotted underline-offset-4"
          style={{
            color: isEqual ? "hsl(var(--primary))" : "#3B82F6",
          }}
          disabled={disabled}
        >
          {isEqual ? "equally" : "custom"}
        </button>{" "}
        with {namesDisplay}
      </p>

      {/* Member selection drawer */}
      <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="font-sora">Edit split members</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-1">
            {allActiveMembers.map((m) => {
              const isSelf = m.user_id === currentUserId;
              const label = isSelf ? "You" : m.name;
              const isChecked = activeIds.has(m.id);

              return (
                <button
                  key={m.id}
                  onClick={() => onToggleMember(m.id)}
                  className="flex items-center justify-between w-full rounded-xl px-4 py-3 transition-colors active:bg-muted/50"
                >
                  <span className="text-sm font-semibold text-foreground">
                    {label}
                  </span>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                      isChecked
                        ? "bg-primary"
                        : "border-2 border-muted-foreground/30"
                    }`}
                  >
                    {isChecked && (
                      <Check className="w-3 h-3 text-primary-foreground" />
                    )}
                  </div>
                </button>
              );
            })}

          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
