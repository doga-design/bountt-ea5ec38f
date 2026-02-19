import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Group } from "@/types";
import { useApp } from "@/contexts/AppContext";
import { LogOut, Trash2 } from "lucide-react";
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
  const [confirmName, setConfirmName] = useState("");
  const { leaveGroup, deleteGroup } = useApp();
  const navigate = useNavigate();

  const handleLeave = async () => {
    await leaveGroup(group.id);
    navigate("/");
  };

  const handleDelete = async () => {
    if (confirmName !== group.name) return;
    await deleteGroup(group.id);
    navigate("/");
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-destructive">Danger Zone</h2>

      <button
        onClick={() => setShowLeave(true)}
        className="w-full bg-card rounded-xl p-4 flex items-center gap-3 text-left"
      >
        <LogOut className="w-5 h-5 text-destructive" />
        <div>
          <p className="text-sm font-medium text-foreground">Leave Group</p>
          <p className="text-xs text-muted-foreground">You'll lose access to expenses</p>
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

      {/* Leave dialog */}
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
            <AlertDialogAction onClick={handleLeave} className="bg-destructive text-destructive-foreground">
              Leave
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
              This action cannot be undone. Type the group name to confirm.
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
              disabled={confirmName !== group.name}
              className="bg-destructive text-destructive-foreground disabled:opacity-50"
            >
              Delete Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
