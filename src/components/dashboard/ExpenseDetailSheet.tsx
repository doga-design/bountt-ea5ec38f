import { useState, useEffect, useRef, useCallback } from "react";
import { Expense, ExpenseSplit, GroupMember, ActivityLog } from "@/types";
import { formatCurrency } from "@/lib/bountt-utils";
import { getAvatarColor, getAvatarImage } from "@/lib/avatar-utils";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, Trash2, Check } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import ExpenseSpokeViz, { SpokeMember } from "./ExpenseSpokeViz";
import ExpenseSettledState from "./ExpenseSettledState";

interface ExpenseDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
  splits: ExpenseSplit[];
  groupMembers: GroupMember[];
  onEdit: (expense: Expense, splits: ExpenseSplit[]) => void;
  onSettled?: () => void;
}

export default function ExpenseDetailSheet({
  open,
  onOpenChange,
  expense,
  splits,
  groupMembers,
  onEdit,
  onSettled,
}: ExpenseDetailSheetProps) {
  const { user, profile, currentGroup, fetchExpenses, fetchExpenseSplits } = useApp();
  const { toast } = useToast();

  // Delete state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Settlement state
  const [settleLoading, setSettleLoading] = useState(false);
  const [settleAllLoading, setSettleAllLoading] = useState(false);

  // Confirmation popover for payer settling a member
  const [confirmSplit, setConfirmSplit] = useState<{ splitId: string; name: string; amount: number } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const avatarRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Slide-to-settle
  const slideTrackRef = useRef<HTMLDivElement>(null);
  const [slideX, setSlideX] = useState(0);
  const [sliding, setSliding] = useState(false);
  const [slideCompleted, setSlideCompleted] = useState(false);

  // Activity log
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Derived values (safe even when expense is null)
  const isCreator = expense ? expense.created_by === user?.id : false;
  const isPayer = expense ? expense.paid_by_user_id === user?.id : false;
  const expenseSplits = expense ? splits.filter((s) => s.expense_id === expense.id) : [];
  const expenseFullySettled = expense?.is_settled === true;

  // Auto-close on full settlement
  const prevSettledRef = useRef(false);
  useEffect(() => {
    if (open && expenseFullySettled && !prevSettledRef.current) {
      prevSettledRef.current = true;
      const timer = setTimeout(() => {
        onOpenChange(false);
        onSettled?.();
      }, 800);
      return () => clearTimeout(timer);
    }
    if (!open) {
      prevSettledRef.current = false;
    }
  }, [open, expenseFullySettled]);

  // Build subtitle
  const payerLabel = isPayer ? "You" : (expense?.paid_by_name ?? "");
  const otherSplitNames = expenseSplits
    .filter((s) => s.user_id !== expense?.paid_by_user_id)
    .map((s) => (s.user_id === user?.id ? "You" : s.member_name));
  const subtitle = `${payerLabel} paid, splitting with ${otherSplitNames.join(" & ")}`;

  // Creator label
  const isCreatorMe = expense?.created_by === user?.id;
  const creatorMember = groupMembers.find((m) => m.user_id === expense?.created_by && m.status === "active");
  const creatorLabel = isCreatorMe ? "you" : (creatorMember?.name ?? "Unknown");

  // Date formatted
  const dateStr = expense ? new Date(expense.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }) : "";

  // Build spoke members — exclude payer (they already paid)
  const nonPayerSplits = expenseSplits.filter((s) => s.user_id !== expense?.paid_by_user_id);
  const spokeMembers: SpokeMember[] = nonPayerSplits.map((s) => {
    const member = groupMembers.find(
      (m) =>
        (s.user_id && m.user_id === s.user_id) ||
        (!s.user_id && m.name === s.member_name && m.is_placeholder)
    );
    return {
      splitId: s.id,
      name: s.member_name,
      userId: s.user_id,
      shareAmount: Number(s.share_amount),
      isSettled: s.is_settled,
      member: member ?? null,
    };
  });

  // Payer member
  const payerMember = groupMembers.find(
    (m) => m.user_id === expense?.paid_by_user_id && m.status === "active"
  ) ?? null;

  // Settled state members — exclude payer
  const settledMembers = nonPayerSplits.map((s) => {
    const member = groupMembers.find(
      (m) =>
        (s.user_id && m.user_id === s.user_id) ||
        (!s.user_id && m.name === s.member_name && m.is_placeholder)
    );
    return { name: s.member_name, member: member ?? null };
  });

  // Fetch per-expense activity logs
  useEffect(() => {
    if (!open || !expense || !currentGroup) {
      setActivityLogs([]);
      return;
    }

    const fetchLogs = async () => {
      const { data } = await supabase
        .from("activity_log")
        .select("*")
        .eq("group_id", currentGroup.id)
        .filter("expense_snapshot->>expense_id", "eq", expense.id)
        .order("created_at", { ascending: false });

      if (data) setActivityLogs(data as unknown as ActivityLog[]);
    };

    fetchLogs();

    // Realtime subscription
    const channel = supabase
      .channel(`activity-log-${expense.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_log", filter: `group_id=eq.${currentGroup.id}` },
        (payload) => {
          const newEntry = payload.new as unknown as ActivityLog;
          if (newEntry.expense_snapshot?.expense_id === expense.id) {
            setActivityLogs((prev) => [newEntry, ...prev]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [open, expense?.id, currentGroup?.id]);

  // --- Handlers ---

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
      await Promise.all([fetchExpenses(currentGroup.id), fetchExpenseSplits(currentGroup.id)]);
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
    if (!expense || !user || !currentGroup || settleLoading) return;
    setSettleLoading(true);
    try {
      const { error } = await supabase.rpc("settle_my_share", { p_expense_id: expense.id });
      if (error) throw error;
      await Promise.all([fetchExpenses(currentGroup.id), fetchExpenseSplits(currentGroup.id)]);
      toast({ title: "Share settled ✓" });
      onSettled?.();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Something went wrong.", variant: "destructive" });
    } finally {
      setSettleLoading(false);
    }
  };

  const handleSettleMemberShare = async (splitId: string) => {
    if (!expense || !user || !currentGroup || confirmLoading) return;
    setConfirmLoading(true);
    try {
      const { error } = await supabase.rpc("settle_member_share", {
        p_expense_id: expense.id,
        p_split_id: splitId,
      });
      if (error) throw error;
      await Promise.all([fetchExpenses(currentGroup.id), fetchExpenseSplits(currentGroup.id)]);
      setConfirmSplit(null);
      toast({ title: "Share settled ✓" });
      onSettled?.();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Something went wrong.", variant: "destructive" });
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleSettleAll = async () => {
    if (!expense || !user || !currentGroup || settleAllLoading) return;
    setSettleAllLoading(true);
    try {
      const { error } = await supabase.rpc("settle_all", { p_expense_id: expense.id });
      if (error) throw error;
      await Promise.all([fetchExpenses(currentGroup.id), fetchExpenseSplits(currentGroup.id)]);
      toast({ title: "Expense fully settled" });
      onSettled?.();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Something went wrong.", variant: "destructive" });
    } finally {
      setSettleAllLoading(false);
    }
  };

  const handleMemberTap = (splitId: string, memberName: string, shareAmount: number) => {
    const split = expenseSplits.find((s) => s.id === splitId);
    if (!split || split.is_settled) return;

    // Current user tapping own avatar → settle immediately
    if (split.user_id === user?.id) {
      handleSettleMyShare();
      return;
    }

    // Payer tapping another member → show confirmation popover
    if (isPayer) {
      setConfirmSplit({ splitId, name: memberName, amount: shareAmount });
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setConfirmDelete(false);
      setDeleteError(null);
      setConfirmSplit(null);
      setSlideX(0);
      setSliding(false);
      setSlideCompleted(false);
    }
    onOpenChange(open);
  };

  // --- Slide to settle gesture ---
  const SLIDE_THRESHOLD = 0.85;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (slideCompleted || settleAllLoading) return;
    setSliding(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [slideCompleted, settleAllLoading]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!sliding || !slideTrackRef.current) return;
    const track = slideTrackRef.current.getBoundingClientRect();
    const thumbWidth = 48;
    const maxX = track.width - thumbWidth;
    const newX = Math.max(0, Math.min(e.clientX - track.left - thumbWidth / 2, maxX));
    setSlideX(newX);
  }, [sliding]);

  const handlePointerUp = useCallback(() => {
    if (!sliding || !slideTrackRef.current) return;
    setSliding(false);
    const track = slideTrackRef.current.getBoundingClientRect();
    const thumbWidth = 48;
    const maxX = track.width - thumbWidth;
    if (slideX / maxX >= SLIDE_THRESHOLD) {
      setSlideCompleted(true);
      setSlideX(maxX);
      handleSettleAll();
    } else {
      setSlideX(0);
    }
  }, [sliding, slideX]);

  // Ref callback for avatar positioning
  const setAvatarRef = useCallback((splitId: string, el: HTMLDivElement | null) => {
    avatarRefs.current[splitId] = el;
  }, []);

  const hasUnsettledSplits = expenseSplits.some((s) => !s.is_settled);

  if (!expense) return null;

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent>
        <DrawerHeader className="relative pb-2">
          {/* Header: description · amount */}
          <DrawerTitle className="font-sora text-lg pr-20">
            {expense.description} · {formatCurrency(Number(expense.amount))}
          </DrawerTitle>

          {/* Edit + Delete icons */}
          <div className="absolute right-4 top-4 flex items-center gap-2">
            {isCreator && !expenseFullySettled && (
              <button
                onClick={() => {
                  onEdit(expense, expenseSplits);
                  onOpenChange(false);
                }}
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"
              >
                <Pencil className="w-4 h-4 text-foreground" />
              </button>
            )}
            {isCreator && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            )}
          </div>

          {/* Subtitle */}
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>

          {/* Date + creator */}
          <p className="text-xs text-muted-foreground mt-0.5">
            {dateStr} · Added by {creatorLabel}
          </p>
        </DrawerHeader>

        <div className="px-4 pb-6">
          {confirmDelete ? (
            /* Delete confirmation */
            <div className="py-2">
              <p className="text-base font-bold text-foreground mb-1">Delete this expense?</p>
              <p className="text-sm font-semibold text-foreground mb-1">"{expense.description}"</p>
              <p className="text-xs text-muted-foreground mb-4">
                This can't be undone. All group members will see this in the activity log.
              </p>
              {deleteError && <p className="text-xs text-destructive mb-3">{deleteError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="flex-1 bg-destructive text-destructive-foreground rounded-xl py-3 text-sm font-bold"
                >
                  {deleteLoading ? "Deleting..." : "Yes, delete it"}
                </button>
                <button
                  onClick={() => { setConfirmDelete(false); setDeleteError(null); }}
                  className="flex-1 bg-muted text-foreground rounded-xl py-3 text-sm font-bold"
                >
                  Keep it
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Divider */}
              <div className="h-px bg-border mb-4" />

              {/* Visualization */}
              {expenseFullySettled ? (
                <ExpenseSettledState members={settledMembers} />
              ) : (
                <div className="relative">
                  <ExpenseSpokeViz
                    payer={payerMember}
                    payerName={expense.paid_by_name}
                    totalAmount={Number(expense.amount)}
                    members={spokeMembers}
                    currentUserId={user?.id ?? ""}
                    isPayer={isPayer}
                    onMemberTap={handleMemberTap}
                    memberAvatarRef={setAvatarRef}
                  />

                  {/* Confirmation popover — anchored below tapped avatar */}
                  {confirmSplit && (
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-0 z-50 w-[260px]">
                      <div className="bg-card rounded-xl border border-border shadow-lg p-4 space-y-3">
                        <p className="text-sm text-foreground">
                          <span className="font-semibold">{confirmSplit.name}</span> still owes{" "}
                          {formatCurrency(confirmSplit.amount)}, do you want to settle it up?
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSettleMemberShare(confirmSplit.splitId)}
                            disabled={confirmLoading}
                            className="flex-1 bg-foreground text-background rounded-xl py-2.5 text-sm font-bold"
                          >
                            {confirmLoading ? "Settling..." : "Confirm"}
                          </button>
                          <button
                            onClick={() => setConfirmSplit(null)}
                            className="flex-1 bg-muted text-foreground rounded-xl py-2.5 text-sm font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Slide to settle everyone — payer only */}
              {isPayer && hasUnsettledSplits && !expenseFullySettled && (
                <div className="mt-4">
                  <div
                    ref={slideTrackRef}
                    className="relative h-14 rounded-full bg-muted overflow-hidden select-none touch-none"
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                  >
                    {/* Track label */}
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-muted-foreground pointer-events-none">
                      {slideCompleted ? "Settling..." : "Slide to settle everyone →"}
                    </span>

                    {/* Progress fill */}
                    <div
                      className="absolute left-0 top-0 h-full bg-foreground/10 transition-none"
                      style={{ width: slideX + 48 }}
                    />

                    {/* Draggable thumb */}
                    <div
                      className="absolute top-1 left-1 w-12 h-12 rounded-full bg-foreground flex items-center justify-center cursor-grab active:cursor-grabbing"
                      style={{
                        transform: `translateX(${slideX}px)`,
                        transition: sliding ? "none" : "transform 0.3s ease",
                      }}
                      onPointerDown={handlePointerDown}
                    >
                      <span className="text-background text-lg font-bold">»</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Per-expense activity log */}
              {activityLogs.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Activity
                  </p>
                  <div className="space-y-2">
                    {activityLogs.map((log) => {
                      const isMe = log.actor_id === user?.id;
                      const actorLabel = isMe ? "You" : log.actor_name;
                      const logDate = new Date(log.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                      const amount = log.expense_snapshot?.amount;

                      let actionLabel = "";
                      if (log.action_type === "settled") {
                        actionLabel = "Settled Share";
                      } else if (log.action_type === "added") {
                        actionLabel = "Paid";
                      } else if (log.action_type === "edited") {
                        const detail = log.change_detail?.[0];
                        actionLabel = detail ? `Edited ${detail.field}` : "Edited";
                      } else if (log.action_type === "deleted") {
                        actionLabel = "Deleted";
                      }

                      return (
                        <div key={log.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {logDate} · {actorLabel} {actionLabel}
                          </span>
                          {amount != null && (
                            <span className="font-medium text-foreground">
                              {formatCurrency(Number(amount))}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
