import { GroupMember } from "@/types";

interface SplitSentenceProps {
  splitMode: "equal" | "custom";
  onToggleMode: () => void;
  activeMembers: GroupMember[];
  currentUserId: string | undefined;
  disabled: boolean;
  isSingleUser?: boolean;
  payerMember: GroupMember | undefined;
  onCyclePayer: () => void;
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
}: SplitSentenceProps) {
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
  const selfIncludedInSplit = activeMembers.some((m) => m.user_id === currentUserId && m.id !== payerMember?.id);

  let namesDisplay: React.ReactNode;
  if (others.length === 0) {
    namesDisplay = <span className="font-bold text-foreground">yourself</span>;
  } else if (others.length === 1) {
    const label = others[0].user_id === currentUserId ? "you" : others[0].name;
    namesDisplay = <span className="font-bold text-foreground">{label}</span>;
  } else if (others.length === 2) {
    namesDisplay = (
      <>
        <span className="font-bold text-foreground">
          {others[0].user_id === currentUserId ? "you" : others[0].name}
        </span>
        {" & "}
        <span className="font-bold text-foreground">
          {others[1].user_id === currentUserId ? "you" : others[1].name}
        </span>
      </>
    );
  } else {
    namesDisplay = (
      <>
        {others.slice(0, -1).map((m, i) => (
          <span key={m.id}>
            <span className="font-bold text-foreground">
              {m.user_id === currentUserId ? "you" : m.name}
            </span>
            {i < others.length - 2 ? ", " : ""}
          </span>
        ))}
        {" & "}
        <span className="font-bold text-foreground">
          {others[others.length - 1].user_id === currentUserId
            ? "you"
            : others[others.length - 1].name}
        </span>
      </>
    );
  }

  const isEqual = splitMode === "equal";

  return (
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
  );
}
