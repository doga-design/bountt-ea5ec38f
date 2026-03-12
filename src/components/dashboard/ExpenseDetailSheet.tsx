import { useState } from "react";
import { Expense, ExpenseSplit, GroupMember } from "@/types";
import { formatCurrency } from "@/lib/bountt-utils";
import { getAvatarColor } from "@/lib/avatar-utils";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, Trash2, Lock, Check } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface ExpenseDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
  splits: ExpenseSplit[];
  groupMembers: GroupMember[];
  onEdit: (expense: Expense, splits: ExpenseSplit[]) => void;
}

export default function ExpenseDetailSheet({
  open,
  onOpenChange,
  expense,
  splits,
  groupMembers,
  onEdit,
}: ExpenseDetailSheetProps) {
  const { user, profile, currentGroup, fetchExpenses, fetchExpenseSplits } = useApp();
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [settleConfirm, setSettleConfirm] = useState(false);
  const [settleLoading, setSettleLoading] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [settleAllLoading, setSettleAllLoading] = useState(false);

  if (!expense) return null;

  const isCreator = expense.created_by === user?.id;
  const isPayer = expense.paid_by_user_id === user?.id;
  const expenseSplits = splits.filter((s) => s.expense_id === expense.id);
  const mySplit = expenseSplits.find((s) => s.user_id === user?.id);
  const iAlreadySettled = mySplit?.is_settled === true;
  const expenseFullySettled = expense.is_settled === true;

  // Find creator member name
  const creatorMember = groupMembers.find(
    (m) => m.user_id === expense.created_by && m.status === "active"
  );
  const creatorName = creatorMember?.name ?? "Unknown";

  const handleDelete = async () => {
    if (!expense || !user || !currentGroup) return;
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const actorName = profile?.display_name ?? user.email?.split("@")[0] ?? "Unknown";
      const { error } = await supabase.rpc("delete_expense", {
        p_expense_id: expense.id,
        p_actor_name: actorName,
      });

      if (error) throw error;

      await Promise.all([
        fetchExpenses(currentGroup.id),
        fetchExpenseSplits(currentGroup.id),
      ]);

      onOpenChange(false);
      setConfirmDelete(false);
      toast({ title: "Expense deleted" });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSettleMyShare = async () => {
    if (!expense || !user || !currentGroup) return;
    setSettleLoading(true);
    setSettleError(null);

    try {
      const { error } = await supabase.rpc("settle_my_share", {
        p_expense_id: expense.id,
      });

      if (error) throw error;

      await Promise.all([
        fetchExpenses(currentGroup.id),
        fetchExpenseSplits(currentGroup.id),
      ]);

      setSettleConfirm(false);
      toast({ title: "Share settled ✓" });
    } catch (err) {
      setSettleError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSettleLoading(false);
    }
  };

  const handleSettleAll = async () => {
    if (!expense || !user || !currentGroup) return;
    setSettleAllLoading(true);

    try {
      const { error } = await supabase.rpc("settle_all", {
        p_expense_id: expense.id,
      });

      if (error) throw error;

      await Promise.all([
        fetchExpenses(currentGroup.id),
        fetchExpenseSplits(currentGroup.id),
      ]);

      toast({ title: "Expense fully settled" });
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : "Something went wrong. Try again.",
        variant: "destructive",
      });
    } finally {
      setSettleAllLoading(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setConfirmDelete(false);
      setDeleteError(null);
      setSettleConfirm(false);
      setSettleError(null);
    }
    onOpenChange(open);
  };

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent>
        <DrawerHeader className="relative">
          <DrawerTitle className="font-sora text-lg">{expense.description}</DrawerTitle>
          {/* Settled badge */}
          {expenseFullySettled && (
            <div className="flex items-center gap-1 mt-1">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-600">Settled</span>
            </div>
          )}
          {isCreator && !expenseFullySettled && (
            <div className="absolute right-4 top-4 flex items-center gap-2">
              <button
                onClick={() => {
                  onEdit(expense, expenseSplits);
                  onOpenChange(false);
                }}
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"
              >
                <Pencil className="w-4 h-4 text-foreground" />
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </div>
          )}
        </DrawerHeader>

        <div className="px-4 pb-6">
          {!confirmDelete ? (
            <>
              {/* Amount */}
              <p className="text-3xl font-bold text-foreground font-sora mb-1">
                {formatCurrency(Number(expense.amount))}
              </p>

              {/* Paid by */}
              <p className="text-sm text-muted-foreground mb-4">
                Paid by{" "}
                <span className="font-semibold text-foreground">
                  {expense.paid_by_user_id === user?.id ? "You" : expense.paid_by_name}
                </span>
              </p>

              {/* Split breakdown */}
              <div className="space-y-2 mb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Split breakdown
                </p>
                {expenseSplits.map((split) => {
                  const member = groupMembers.find(
                    (m) => (split.user_id && m.user_id === split.user_id) ||
                      (!split.user_id && m.name === split.member_name && m.is_placeholder)
                  );
                  const color = member ? getAvatarColor(member) : "#8B5CF6";
                  const isMe = split.user_id === user?.id;
                  const label = isMe ? "You" : split.member_name;

                  return (
                    <div key={split.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm text-foreground">{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {formatCurrency(Number(split.share_amount))}
                        </span>
                        {split.is_settled && (
                          <span className={`text-xs font-medium ${isMe ? "text-emerald-600" : "text-muted-foreground"}`}>
                            {isMe ? "Your share settled ✓" : "Settled"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Date */}
              <p className="text-xs text-muted-foreground">
                {new Date(expense.date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>

              {/* Non-creator badge */}
              {!isCreator && !expenseFullySettled && (
                <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2 w-fit">
                  <Lock className="w-3 h-3" />
                  Logged by {creatorName}
                </div>
              )}

              {/* Settlement actions */}
              {!expenseFullySettled && (
                <div className="mt-4 space-y-2">
                  {/* Settle my share */}
                  {mySplit && !iAlreadySettled && !isPayer && (
                    <>
                      {!settleConfirm ? (
                        <button
                          onClick={() => setSettleConfirm(true)}
                          className="w-full bg-foreground text-background rounded-xl py-3 text-sm font-bold"
                        >
                          Settle my share
                        </button>
                      ) : (
                        <div className="bg-muted rounded-xl p-4 space-y-3">
                          <p className="text-sm font-semibold text-foreground">
                            Did you send {formatCurrency(Number(mySplit.share_amount))} to {expense.paid_by_name}?
                          </p>
                          {settleError && (
                            <p className="text-xs text-destructive">{settleError}</p>
                          )}
                          <button
                            onClick={handleSettleMyShare}
                            disabled={settleLoading}
                            className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-bold"
                          >
                            {settleLoading ? "Settling..." : "Yes, I sent it"}
                          </button>
                          <button
                            onClick={() => {
                              setSettleConfirm(false);
                              setSettleError(null);
                            }}
                            className="w-full text-sm text-muted-foreground font-medium py-1"
                          >
                            I'll do it later
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {/* Settle all (payer only) */}
                  {isPayer && (
                    <button
                      onClick={handleSettleAll}
                      disabled={settleAllLoading}
                      className="w-full border border-foreground/20 text-foreground rounded-xl py-3 text-sm font-bold"
                    >
                      {settleAllLoading ? "Settling..." : "Settle all"}
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Delete confirmation */
            <div className="py-2">
              <p className="text-base font-bold text-foreground mb-1">
                Delete this expense?
              </p>
              <p className="text-sm font-semibold text-foreground mb-1">
                "{expense.description}"
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                This can't be undone. All group members will see this in the activity log.
              </p>

              {deleteError && (
                <p className="text-xs text-destructive mb-3">{deleteError}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="flex-1 bg-destructive text-destructive-foreground rounded-xl py-3 text-sm font-bold"
                >
                  {deleteLoading ? "Deleting..." : "Yes, delete it"}
                </button>
                <button
                  onClick={() => {
                    setConfirmDelete(false);
                    setDeleteError(null);
                  }}
                  className="flex-1 bg-muted text-foreground rounded-xl py-3 text-sm font-bold"
                >
                  Keep it
                </button>
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
