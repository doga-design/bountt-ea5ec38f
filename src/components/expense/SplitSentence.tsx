import { GroupMember } from "@/types";

interface SplitSentenceProps {
  splitMode: "equal" | "custom";
  onToggleMode: () => void;
  activeMembers: GroupMember[];
  currentUserId: string | undefined;
  disabled: boolean;
  isSingleUser?: boolean;
}

export default function SplitSentence({
  splitMode,
  onToggleMode,
  activeMembers,
  currentUserId,
  disabled,
  isSingleUser = false,
}: SplitSentenceProps) {
  if (isSingleUser) {
    return (
      <p className="text-center text-sm font-semibold text-muted-foreground px-6 opacity-40">
        assigning a split
      </p>
    );
  }

  const others = activeMembers.filter((m) => m.user_id !== currentUserId);
  const selfIncluded = activeMembers.some((m) => m.user_id === currentUserId);
  const onlySelf = others.length === 0;

  let namesDisplay: React.ReactNode;
  if (onlySelf) {
    namesDisplay = <span className="font-bold text-blue-500">yourself</span>;
  } else if (others.length === 1) {
    namesDisplay = <span className="font-bold text-blue-500">{others[0].name}</span>;
  } else if (others.length === 2) {
    namesDisplay = (
      <>
        <span className="font-bold text-blue-500">{others[0].name}</span>
        {" & "}
        <span className="font-bold text-blue-500">{others[1].name}</span>
      </>
    );
  } else {
    namesDisplay = (
      <>
        {others.slice(0, -1).map((m, i) => (
          <span key={m.id}>
            <span className="font-bold text-blue-500">{m.name}</span>
            {i < others.length - 2 ? ", " : ""}
          </span>
        ))}
        {" & "}
        <span className="font-bold text-blue-500">
          {others[others.length - 1].name}
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
      Splitting{" "}
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
      {selfIncluded && !onlySelf && (
        <>
          {" & "}
          <span className="font-bold text-blue-500">you</span>
        </>
      )}
    </p>
  );
}
