import { useState } from "react";
import { Check, Lock } from "lucide-react";
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
  onSetPayer: (memberId: string) => void;
  allActiveMembers: GroupMember[];
  activeIds: Set<string>;
  onToggleMember: (memberId: string) => void;
  hidePayerDrawer?: boolean;
  isCoverMode?: boolean;
  coveredMemberName?: string;
}

export default function SplitSentence({
  splitMode,
  onToggleMode,
  activeMembers,
  currentUserId,
  disabled,
  isSingleUser = false,
  payerMember,
  onSetPayer,
  allActiveMembers,
  activeIds,
  onToggleMember,
  hidePayerDrawer = false,
  isCoverMode = false,
  coveredMemberName,
}: SplitSentenceProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [payerSheetOpen, setPayerSheetOpen] = useState(false);

  // Solo state
  if (isSingleUser && !isCoverMode) {
    return (
      <p className="text-center text-sm font-semibold text-muted-foreground px-6 opacity-60">
        You paid · personal expense
      </p>
    );
  }

  const payerIsYou = payerMember?.user_id === currentUserId;
  const payerDisplay = payerIsYou ? "You" : payerMember?.name ?? "You";

  const isEqual = splitMode === "equal";

  // Cover mode sentence
  if (isCoverMode) {
    const coveredName = coveredMemberName ?? "someone";
    const coveredIsYou = activeMembers.length === 1 && activeMembers[0]?.user_id === currentUserId;
    const coveredDisplay = coveredIsYou ? "you" : coveredName;

    return (
      <>
        <p
          className={`text-center text-sm font-semibold text-muted-foreground px-6 ${
            disabled ? "opacity-40 pointer-events-none" : ""
          }`}
        >
          <button
            onClick={() => hidePayerDrawer ? onSetPayer("") : setPayerSheetOpen(true)}
            className="font-extrabold underline decoration-dotted underline-offset-4 text-foreground"
            disabled={disabled}
          >
            {payerDisplay}
          </button>
          {" paid, covering for "}
          <button
            onClick={() => setSheetOpen(true)}
            className="font-bold text-foreground underline decoration-dotted underline-offset-4 active:opacity-50 transition-opacity"
            disabled={disabled}
          >
            {coveredDisplay}
          </button>
        </p>

        {/* Member selection drawer (cover mode - single select) */}
        <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle className="font-sora">Who are you covering?</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 space-y-1">
              {allActiveMembers
                .filter((m) => m.user_id !== currentUserId)
                .map((m) => {
                  const isChecked = activeIds.has(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        onToggleMember(m.id);
                        setSheetOpen(false);
                      }}
                      className="flex items-center justify-between w-full rounded-xl px-4 py-3 transition-colors active:bg-muted/50"
                    >
                      <span className="text-sm font-semibold text-foreground">{m.name}</span>
                      {isChecked && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })}
            </div>
          </DrawerContent>
        </Drawer>

        {/* Payer selection drawer */}
        <CoverPayerDrawer
          open={payerSheetOpen}
          onOpenChange={setPayerSheetOpen}
          allActiveMembers={allActiveMembers}
          currentUserId={currentUserId}
          payerMember={payerMember}
          onSetPayer={onSetPayer}
          coveredMemberId={activeMembers[0]?.id}
        />
      </>
    );
  }

  // Split mode sentence
  const others = activeMembers.filter((m) => m.id !== payerMember?.id);

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
          onClick={() => hidePayerDrawer ? onSetPayer("") : setPayerSheetOpen(true)}
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
              const isPayer = m.id === payerMember?.id;
              const isChecked = activeIds.has(m.id) || isPayer;

              return (
                <button
                  key={m.id}
                  onClick={() => !isPayer && onToggleMember(m.id)}
                  disabled={isPayer}
                  className={`flex items-center justify-between w-full rounded-xl px-4 py-3 transition-colors ${
                    isPayer ? "opacity-60" : "active:bg-muted/50"
                  }`}
                >
                  <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                    {label}
                    {isPayer && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        payer
                      </span>
                    )}
                  </span>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                      isChecked
                        ? isPayer
                          ? "bg-primary/50"
                          : "bg-primary"
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

      {/* Payer selection drawer */}
      <Drawer open={payerSheetOpen} onOpenChange={setPayerSheetOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="font-sora">Who paid?</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-1">
            {allActiveMembers.map((m) => {
              const isSelf = m.user_id === currentUserId;
              const label = isSelf ? "You" : m.name;
              const isSelected = m.id === payerMember?.id;

              return (
                <button
                  key={m.id}
                  onClick={() => {
                    onSetPayer(m.id);
                    setPayerSheetOpen(false);
                  }}
                  className="flex items-center justify-between w-full rounded-xl px-4 py-3 transition-colors active:bg-muted/50"
                >
                  <span className="text-sm font-semibold text-foreground">
                    {label}
                  </span>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

// Separate payer drawer for cover mode — disables the covered person
function CoverPayerDrawer({
  open,
  onOpenChange,
  allActiveMembers,
  currentUserId,
  payerMember,
  onSetPayer,
  coveredMemberId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  allActiveMembers: GroupMember[];
  currentUserId: string | undefined;
  payerMember: GroupMember | undefined;
  onSetPayer: (id: string) => void;
  coveredMemberId: string | undefined;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="font-sora">Who paid?</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-1">
          {allActiveMembers.map((m) => {
            const isSelf = m.user_id === currentUserId;
            const label = isSelf ? "You" : m.name;
            const isSelected = m.id === payerMember?.id;
            const isCoveredPerson = m.id === coveredMemberId;

            return (
              <button
                key={m.id}
                onClick={() => {
                  if (!isCoveredPerson) {
                    onSetPayer(m.id);
                    onOpenChange(false);
                  }
                }}
                disabled={isCoveredPerson}
                className={`flex items-center justify-between w-full rounded-xl px-4 py-3 transition-colors ${
                  isCoveredPerson ? "opacity-40" : "active:bg-muted/50"
                }`}
              >
                <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                  {label}
                  {isCoveredPerson && (
                    <span className="text-xs text-muted-foreground">being covered</span>
                  )}
                </span>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
