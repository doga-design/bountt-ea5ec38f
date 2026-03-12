import { useState } from "react";
import { GroupMember } from "@/types";
import MemberCard from "./MemberCard";
import { ChevronDown, Plus } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/bountt-utils";

interface MembersListProps {
  members: GroupMember[];
  currentUserId: string;
  isAdmin: boolean;
  groupId: string;
}

export default function MembersList({ members, currentUserId, isAdmin, groupId }: MembersListProps) {
  const [showFormer, setShowFormer] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [newName, setNewName] = useState("");
  const { addPlaceholderMember, removeMember, settleAndRemoveMember, expenses, expenseSplits } = useApp();
  const { toast } = useToast();

  const active = members.filter((m) => m.status === "active" && !m.is_placeholder);
  const placeholders = members.filter((m) => m.status === "active" && m.is_placeholder);
  const former = members.filter((m) => m.status === "left");

  const memberHasUnsettledSplits = (member: GroupMember): boolean => {
    const groupExpenseIds = new Set(expenses.filter((e) => e.group_id === groupId && !e.is_settled).map((e) => e.id));
    return expenseSplits.some((s) => {
      if (s.is_settled) return false;
      if (!groupExpenseIds.has(s.expense_id)) return false;
      if (member.user_id && s.user_id === member.user_id) return true;
      if (!member.user_id && s.member_name === member.name && !s.user_id) return true;
      return false;
    });
  };

  const handleAddMember = async () => {
    if (!newName.trim()) return;
    await addPlaceholderMember(groupId, newName.trim());
    setNewName("");
    setAddingMember(false);
    toast({ title: `${newName.trim()} added` });
  };

  const handleRemove = async (member: GroupMember) => {
    await removeMember(member.id);
    toast({ title: `${member.name} removed` });
  };

  const handleSettleAndRemove = async (member: GroupMember) => {
    const result = await settleAndRemoveMember(groupId, member.id);
    if (result) {
      toast({
        title: `${member.name} removed`,
        description: `Settled ${result.splits_settled} split${result.splits_settled !== 1 ? "s" : ""} (${formatCurrency(result.total_amount)})`,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Members</h2>
        <button
          onClick={() => setAddingMember(true)}
          className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"
        >
          <Plus className="w-4 h-4 text-primary-foreground" />
        </button>
      </div>

      {addingMember && (
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-xl bg-card border border-border px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
            autoFocus
          />
          <button
            onClick={handleAddMember}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
          >
            Add
          </button>
        </div>
      )}

      {/* Active Members */}
      {active.length > 0 && (
        <div className="space-y-2">
          {active.map((m) => (
            <MemberCard
              key={m.id}
              member={m}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onRemove={() => handleRemove(m)}
              onSettleAndRemove={() => handleSettleAndRemove(m)}
              hasUnsettledSplits={memberHasUnsettledSplits(m)}
              type="active"
            />
          ))}
        </div>
      )}

      {/* Placeholder Members */}
      {placeholders.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Not on Bountt yet</p>
          {placeholders.map((m) => (
            <MemberCard
              key={m.id}
              member={m}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onRemove={() => handleRemove(m)}
              onSettleAndRemove={() => handleSettleAndRemove(m)}
              hasUnsettledSplits={memberHasUnsettledSplits(m)}
              type="placeholder"
            />
          ))}
        </div>
      )}

      {/* Former Members */}
      {former.length > 0 && (
        <div>
          <button
            onClick={() => setShowFormer(!showFormer)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2"
          >
            Former Members ({former.length})
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFormer ? "rotate-180" : ""}`} />
          </button>
          {showFormer && (
            <div className="space-y-2">
              {former.map((m) => (
                <MemberCard
                  key={m.id}
                  member={m}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  onRemove={() => {}}
                  type="former"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
