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

/* ───────────────────────── Fixed heights for stable layout ───────────────────────── */
const VIZ_HEIGHT = 260; // spoke viz & settled state share the same height

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

  // Celebrate pending flag — set true when settlement completes, read in close handler
  const celebratePendingRef = useRef(false);

  // Derived values
  const isCreator = expense ? expense.created_by === user?.id : false;
  const isPayer = expense ? expense.paid_by_user_id === user?.id : false;
  const expenseSplits = expense ? splits.filter((s) => s.expense_id === expense.id) : [];
  const expenseFullySettled = expense?.is_settled === true;

  // Snapshot whether expense was already settled when drawer opened
  const settledAtOpenRef = useRef(false);
  useEffect(() => {
    if (open) {
      // Capture settled state at the moment the drawer opens
      settledAtOpenRef.current = expenseFullySettled;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-close on full settlement — only if it transitioned while open
  useEffect(() => {
    if (open && expenseFullySettled && !settledAtOpenRef.current) {
      // Expense just became fully settled while drawer was open (genuine transition)
      celebratePendingRef.current = true;
      // Brief delay so user sees the settled state, then close
      const timer = setTimeout(() => {
        onSettled?.(); // Signal confetti BEFORE closing
        onOpenChange(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [open, expenseFullySettled, onOpenChange, onSettled]);

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

  // Build spoke members — exclude payer
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
      // Don't call onSettled here — auto-close effect handles it via celebratePendingRef
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Something went wrong.", variant: "destructive" });
      // Reset slider so user can retry
      setSlideCompleted(false);
      setSlideX(0);
      setSettleAllLoading(false);
    }
  };

  const handleMemberTap = (splitId: string, memberName: string, shareAmount: number) => {
    const split = expenseSplits.find((s) => s.id === splitId);
    if (!split || split.is_settled) return;

    if (split.user_id === user?.id) {
      handleSettleMyShare();
      return;
    }

    if (isPayer) {
      setConfirmSplit({ splitId, name: memberName, amount: shareAmount });
    }
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setConfirmDelete(false);
      setDeleteError(null);
      setConfirmSplit(null);
      setSlideX(0);
      setSliding(false);
      setSlideCompleted(false);
    }
    onOpenChange(nextOpen);
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

  const setAvatarRef = useCallback((splitId: string, el: HTMLDivElement | null) => {
    avatarRefs.current[splitId] = el;
  }, []);

  const hasUnsettledSplits = nonPayerSplits.some((s) => !s.is_settled);

  if (!expense) return null;

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent className="h-[90dvh] max-h-[90dvh]">
        {/* Full-height flex container with 3 sections */}
        <div className="h-full flex flex-col min-h-0 px-4 pb-4 pt-2">

          {/* ═══════════════ SECTION 1: TOP — Header ═══════════════ */}
          <div className="flex items-start justify-between gap-3 shrink-0 pb-3">
            {/* Left: title, subtitle, date */}
            <div className="min-w-0 flex-1">
              <h2 className="font-sora text-lg font-bold text-foreground truncate">
                {expense.description} · {formatCurrency(Number(expense.amount))}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{subtitle}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {dateStr} · Added by {creatorLabel}
              </p>
            </div>

            {/* Right: action buttons */}
            <div className="flex items-center gap-2 shrink-0">
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
          </div>

          {/* Divider between top and middle */}
          <div className="h-px bg-border shrink-0" />

          {confirmDelete ? (
            /* Delete confirmation overlay */
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full max-w-sm">
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
            </div>
          ) : (
            <>
              {/* ═══════════════ SECTION 2: MIDDLE — Interactive viz ═══════════════ */}
              <div className="flex-1 min-h-0 flex items-center justify-center py-4">
                <div className="w-full" style={{ height: VIZ_HEIGHT }}>
                  {expenseFullySettled ? (
                    <div className="h-full flex items-center justify-center">
                      <ExpenseSettledState members={settledMembers} />
                    </div>
                  ) : (
                    <div className="relative h-full">
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

                      {/* Confirmation popover */}
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
                </div>
              </div>

              {/* ═══════════════ SECTION 3: BOTTOM — Activity log + Slider ═══════════════ */}
              <div className="shrink-0">
                {/* Activity log */}
                {activityLogs.length > 0 && (
                  <div className="mb-3">
                    <div className="h-px bg-border mb-3" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Activity
                    </p>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
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
                          const isLogActorPayer = log.actor_id === expense?.paid_by_user_id;
                          actionLabel = isLogActorPayer ? "Paid & Settled Share" : "Paid";
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

                {/* Slide to settle — payer only, divider above */}
                {isPayer && hasUnsettledSplits && !expenseFullySettled && (
                  <>
                    <div className="h-px bg-border mb-3" />
                    <div
                      ref={slideTrackRef}
                      className="relative h-14 rounded-full bg-muted overflow-hidden select-none touch-none"
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-muted-foreground pointer-events-none">
                        {slideCompleted ? "Settling..." : "Slide to settle everyone →"}
                      </span>

                      <div
                        className="absolute left-0 top-0 h-full bg-foreground/10 transition-none"
                        style={{ width: slideX + 48 }}
                      />

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
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
