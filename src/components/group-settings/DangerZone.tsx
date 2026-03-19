import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Group, GroupMember } from "@/types";
import { useApp } from "@/contexts/AppContext";
import { LogOut, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAvatarColor, getAvatarImage } from "@/lib/avatar-utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DangerZoneProps {
  group: Group;
  isAdmin: boolean;
}

export default function DangerZone({ group, isAdmin }: DangerZoneProps) {
  const [showLeave, setShowLeave] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const { leaveGroup, deleteGroup, transferOwnership, groupMembers, user, expenses } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check for unsettled balances
  const hasUnsettledBalances = useMemo(() => {
    const groupExpenses = expenses.filter((e) => e.group_id === group.id && !e.is_settled);
    return groupExpenses.length > 0;
  }, [expenses, group.id]);

  // Check if user is sole admin
  const isSoleAdmin = isAdmin && groupMembers.filter(
    (m) => m.group_id === group.id && m.role === "admin" && m.status === "active"
  ).length <= 1;

  // Eligible transfer targets: active, non-placeholder, not self
  const transferCandidates = useMemo(() => {
    return groupMembers.filter(
      (m) =>
        m.group_id === group.id &&
        m.status === "active" &&
        !m.is_placeholder &&
        m.user_id !== user?.id
    );
  }, [groupMembers, group.id, user?.id]);

  const handleLeaveClick = () => {
    if (isSoleAdmin) {
      if (transferCandidates.length === 0) {
        // No eligible successors — dead end, must delete or add members
        toast({
          title: "You're the only member. Delete the group or add another member first.",
          variant: "destructive",
        });
        return;
      }
      // Show transfer picker
      setShowTransfer(true);
    } else {
      setShowLeave(true);
    }
  };

  const handleLeave = async () => {
    setLeaveLoading(true);
    await leaveGroup(group.id);
    setLeaveLoading(false);
    navigate("/");
  };

  const handleTransferAndLeave = async (newOwner: GroupMember) => {
    if (!newOwner.user_id) return;
    setTransferLoading(true);
    const success = await transferOwnership(group.id, newOwner.user_id);
    if (success) {
      await leaveGroup(group.id);
      setTransferLoading(false);
      navigate("/");
    } else {
      setTransferLoading(false);
    }
  };

  const handleDelete = async () => {
    if (confirmName !== group.name) return;
    setDeleteLoading(true);
    await deleteGroup(group.id);
    setDeleteLoading(false);
    navigate("/");
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-destructive">Danger Zone</h2>

      <button
        onClick={handleLeaveClick}
        className="w-full bg-card rounded-xl p-4 flex items-center gap-3 text-left"
      >
        <LogOut className="w-5 h-5 text-destructive" />
        <div>
          <p className="text-sm font-medium text-foreground">Leave Group</p>
          <p className="text-xs text-muted-foreground">
            {isSoleAdmin && transferCandidates.length === 0
              ? "Add another member or delete the group"
              : isSoleAdmin
                ? "You'll need to assign a new admin first"
                : "You'll lose access to expenses"}
          </p>
        </div>
      </button>

      {isAdmin && (
        <button
          onClick={() => setShowDelete(true)}
          className="w-full bg-card rounded-xl p-4 flex items-center gap-3 text-left"
        >
          <Trash2 className="w-5 h-5 text-destructive" />
          <div>
            <p className="text-sm font-medium text-foreground">Delete Group</p>
            <p className="text-xs text-muted-foreground">All expenses will be permanently lost</p>
          </div>
        </button>
      )}

      {/* Transfer & Leave dialog */}
      <AlertDialog open={showTransfer} onOpenChange={setShowTransfer}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Choose a new admin</AlertDialogTitle>
            <AlertDialogDescription>
              You're the only admin. Pick someone to take over before you leave.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            {transferCandidates.map((member) => {
              const colors = getAvatarColor(member);
              const avatarSrc = getAvatarImage(member);
              return (
                <button
                  key={member.id}
                  onClick={() => handleTransferAndLeave(member)}
                  disabled={transferLoading}
                  className="w-full flex items-center gap-3 rounded-xl p-3 hover:bg-muted/50 transition-colors disabled:opacity-50"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: colors.bg }}
                  >
                    <img src={avatarSrc} alt={member.name} className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{member.name}</span>
                </button>
              );
            })}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={transferLoading}>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave dialog (non-sole-admin) */}
      <AlertDialog open={showLeave} onOpenChange={setShowLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave {group.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll lose access to all shared expenses in this group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeave}
              disabled={leaveLoading}
              className="bg-destructive text-destructive-foreground disabled:opacity-50"
            >
              {leaveLoading ? "Leaving…" : "Leave"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete dialog */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {group.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {hasUnsettledBalances
                ? "⚠️ This group has unsettled balances. Deleting it means all debts will be lost. This action cannot be undone. Type the group name to confirm."
                : "This action cannot be undone. Type the group name to confirm."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-destructive"
            placeholder={group.name}
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmName("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={confirmName !== group.name || deleteLoading}
              className="bg-destructive text-destructive-foreground disabled:opacity-50"
            >
              {deleteLoading ? "Deleting…" : "Delete Group"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
