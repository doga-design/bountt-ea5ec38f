import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { X, ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { distributeCents } from "@/lib/bountt-utils";
import confetti from "canvas-confetti";
import { GroupMember, Expense, ExpenseSplit } from "@/types";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";

import AmountDisplay from "./AmountDisplay";
import SplitSentence from "./SplitSentence";
import CustomSplitRows from "./CustomSplitRows";
import NumpadGrid from "./NumpadGrid";
import SaveButton from "./SaveButton";


interface ExpenseScreenProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFirstExpense?: boolean;
  editExpense?: Expense;
  editSplits?: ExpenseSplit[];
}

export default function ExpenseScreen({
  open,
  onOpenChange,
  isFirstExpense = false,
  editExpense,
  editSplits,
}: ExpenseScreenProps) {
  const { currentGroup, user, profile, groupMembers, fetchExpenses, fetchExpenseSplits, addPlaceholderMember } = useApp();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [amount, setAmount] = useState("0");
  const [description, setDescription] = useState("");
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set());
  const [focusedMemberId, setFocusedMemberId] = useState<string | null>(null);
  const [customAmounts, setCustomAmounts] = useState<Map<string, string>>(new Map());
  
  const [loading, setLoading] = useState(false);
  const [editingTotal, setEditingTotal] = useState(false);
  const [freshFocus, setFreshFocus] = useState(false);
  const [shakeMemberId, setShakeMemberId] = useState<string | null>(null);
  const [payerId, setPayerId] = useState<string | null>(null);

  // Track amount when entering Step 2 to detect changes on return
  const lastStep2AmountRef = useRef<string>("0");

  // Active members sorted: "You" first
  const activeMembers = useMemo(() => {
    return groupMembers
      .filter((m) => m.status === "active")
      .sort((a, b) => {
        if (a.user_id === user?.id) return -1;
        if (b.user_id === user?.id) return 1;
        return 0;
      });
  }, [groupMembers, user?.id]);

  const isEditMode = !!editExpense;

  // Current user's member ID
  const currentUserMemberId = useMemo(
    () => activeMembers.find((m) => m.user_id === user?.id)?.id,
    [activeMembers, user?.id]
  );

  // Derived cover mode — no separate state
  const isCoverMode = currentUserMemberId ? !activeIds.has(currentUserMemberId) : false;

  useEffect(() => {
    setActiveIds(new Set(activeMembers.map((m) => m.id)));
  }, [activeMembers.length]);

  // KNOWN DEBT: Edit mode always opens in equal mode, losing original custom split data
  useEffect(() => {
    if (open) {
      if (isEditMode && editExpense && editSplits) {
        setStep(2); // Skip Step 1 in edit mode
        setAmount(String(editExpense.amount));
        setDescription(editExpense.description);
        setSplitMode("equal");
        const splitMemberIds = new Set<string>();
        editSplits.forEach((s) => {
          const member = activeMembers.find(
            (m) => (s.user_id && m.user_id === s.user_id) ||
              (!s.user_id && m.name === s.member_name && m.is_placeholder)
          );
          if (member) splitMemberIds.add(member.id);
        });
        if (splitMemberIds.size > 0) {
          setActiveIds(splitMemberIds);
        } else {
          setActiveIds(new Set(activeMembers.map((m) => m.id)));
        }
        const payerM = activeMembers.find(
          (m) => (editExpense.paid_by_user_id && m.user_id === editExpense.paid_by_user_id) ||
            (!editExpense.paid_by_user_id && m.name === editExpense.paid_by_name && m.is_placeholder)
        );
        setPayerId(payerM?.id ?? null);
        setFocusedMemberId(null);
        setCustomAmounts(new Map());
        setEditingTotal(false);
        lastStep2AmountRef.current = String(editExpense.amount);
      } else {
        setStep(1);
        setAmount("0");
        setDescription("");
        setSplitMode("equal");
        setActiveIds(new Set(activeMembers.map((m) => m.id)));
        setFocusedMemberId(null);
        setCustomAmounts(new Map());
        setEditingTotal(false);
        const selfMember = activeMembers.find((m) => m.user_id === user?.id);
        setPayerId(selfMember?.id ?? null);
        lastStep2AmountRef.current = "0";
      }
    }
  }, [open]);

  const payerMember = useMemo(() => {
    const found = activeMembers.find((m) => m.id === payerId);
    if (found) return found;
    return activeMembers.find((m) => m.user_id === user?.id);
  }, [activeMembers, payerId, user?.id]);

  const selectedMembers = useMemo(
    () => activeMembers.filter((m) => activeIds.has(m.id)),
    [activeMembers, activeIds]
  );

  // The covered member name in cover mode
  const coveredMemberName = useMemo(() => {
    if (!isCoverMode) return undefined;
    const covered = selectedMembers[0];
    if (!covered) return undefined;
    return covered.user_id === user?.id ? "you" : covered.name;
  }, [isCoverMode, selectedMembers, user?.id]);

  // Distribute equally helper
  const distributeEqually = useCallback(
    (total: number, members: GroupMember[]) => {
      const shares = distributeCents(total, members.length);
      const map = new Map<string, string>();
      members.forEach((m, i) => {
        map.set(m.id, shares[i].toFixed(2));
      });
      return map;
    },
    []
  );

  // Set payer by member id; ensure new payer is always in activeIds
  const handleSetPayer = useCallback(
    (memberId: string) => {
      setPayerId(memberId);
      setActiveIds((prev) => {
        if (prev.has(memberId)) return prev;
        const next = new Set(prev);
        next.add(memberId);
        if (splitMode === "custom") {
          const newMembers = activeMembers.filter((m) => next.has(m.id));
          const total = parseFloat(amount) || 0;
          setCustomAmounts(distributeEqually(total, newMembers));
          setFocusedMemberId(newMembers[0]?.id ?? null);
        }
        return next;
      });
    },
    [activeMembers, splitMode, amount, distributeEqually]
  );


  const customSum = useMemo(() => {
    let sum = 0;
    for (const id of activeIds) {
      sum += parseFloat(customAmounts.get(id) || "0") || 0;
    }
    return sum;
  }, [customAmounts, activeIds]);

  const totalNum = parseFloat(amount) || 0;
  const remaining = totalNum - customSum;
  const isBalanced = Math.abs(remaining) < 0.01 && totalNum > 0;

  // Distribute: add remaining to focused member; Remove: subtract excess from others
  const handleDistribute = useCallback(() => {
    if (!focusedMemberId || Math.abs(remaining) < 0.01) return;
    const newAmounts = new Map(customAmounts);

    if (remaining > 0.01) {
      // Positive remaining: add all to the focused member
      const current = parseFloat(newAmounts.get(focusedMemberId) || "0") || 0;
      const newVal = current + remaining;
      newAmounts.set(focusedMemberId, newVal.toFixed(2));
    } else {
      // Negative remaining (over-total): remove excess from others
      const others = selectedMembers.filter((m) => m.id !== focusedMemberId);
      if (others.length === 0) return;
      const excess = Math.abs(remaining);
      const perMember = excess / others.length;

      others.forEach((m, i) => {
        const current = parseFloat(newAmounts.get(m.id) || "0") || 0;
        let newVal = current - perMember;
        if (newVal < 0) newVal = 0;
        if (i === others.length - 1) {
          let sumOthers = 0;
          others.slice(0, -1).forEach((om) => {
            sumOthers += parseFloat(newAmounts.get(om.id) || "0") || 0;
          });
          const focusedVal = parseFloat(newAmounts.get(focusedMemberId) || "0") || 0;
          newVal = Math.max(0, totalNum - sumOthers - focusedVal);
        }
        newAmounts.set(m.id, newVal.toFixed(2));
      });
    }

    setCustomAmounts(newAmounts);
  }, [focusedMemberId, remaining, selectedMembers, customAmounts, totalNum]);

  const canDistribute =
    splitMode === "custom" &&
    focusedMemberId !== null &&
    selectedMembers.length >= 2 &&
    selectedMembers.filter((m) => m.id !== focusedMemberId).length > 0;

  // Handle numpad key — Phase 8 bug fix: added customAmounts and activeIds to deps
  const handleKey = useCallback(
    (key: string) => {
      const isCustomFocused = splitMode === "custom" && focusedMemberId && !editingTotal;

      const updateField = (prev: string): string => {
        if (key === "del") {
          return prev.length <= 1 ? "0" : prev.slice(0, -1);
        }
        if (key === "." && prev.includes(".")) return prev;
        const decimals = prev.split(".")[1];
        if (decimals && decimals.length >= 2) return prev;
        if (prev === "0" && key !== ".") return key;
        if (prev.length >= 9) return prev;
        return prev + key;
      };

      if (isCustomFocused) {
        const maxForMember = (() => {
          let othersSum = 0;
          for (const id of activeIds) {
            if (id !== focusedMemberId) {
              othersSum += parseFloat(customAmounts.get(id) || "0") || 0;
            }
          }
          return Math.max(0, totalNum - othersSum);
        })();

        if (freshFocus) {
          setFreshFocus(false);
          setCustomAmounts((prev) => {
            const next = new Map(prev);
            let newVal: string;
            if (key === "del") newVal = "0";
            else if (key === ".") newVal = "0.";
            else newVal = key;

            if (parseFloat(newVal) > maxForMember) {
              setShakeMemberId(focusedMemberId);
              setTimeout(() => setShakeMemberId(null), 350);
              return prev;
            }
            next.set(focusedMemberId!, newVal);
            return next;
          });
          return;
        }
        setCustomAmounts((prev) => {
          const next = new Map(prev);
          const current = next.get(focusedMemberId!) ?? "0";
          const newVal = updateField(current);
          if (parseFloat(newVal) > maxForMember) {
            setShakeMemberId(focusedMemberId);
            setTimeout(() => setShakeMemberId(null), 350);
            return prev;
          }
          next.set(focusedMemberId!, newVal);
          return next;
        });
      } else {
        setAmount((prev) => {
          const newAmount = updateField(prev);
          if (splitMode === "custom") {
            const total = parseFloat(newAmount) || 0;
            setCustomAmounts(distributeEqually(total, selectedMembers));
          }
          return newAmount;
        });
      }
    },
    [splitMode, focusedMemberId, editingTotal, freshFocus, selectedMembers, distributeEqually, customAmounts, activeIds]
  );

  // Toggle split mode
  const toggleMode = useCallback(() => {
    if (splitMode === "equal") {
      setSplitMode("custom");
      const total = parseFloat(amount) || 0;
      setCustomAmounts(distributeEqually(total, selectedMembers));
      setFocusedMemberId(selectedMembers[0]?.id ?? null);
      setFreshFocus(true);
      setEditingTotal(false);
    } else {
      setSplitMode("equal");
      setCustomAmounts(new Map());
      setFocusedMemberId(null);
      setEditingTotal(false);
    }
  }, [splitMode, amount, selectedMembers, distributeEqually]);

  // Toggle chip — cover mode aware
  const handleToggleChip = useCallback(
    (memberId: string) => {
      const isCurrentUser = memberId === currentUserMemberId;

      // Current user tapping themselves
      if (isCurrentUser) {
        if (isCoverMode) {
          // Already in cover mode, tapping ghosted You chip — show toast
          toast({ title: "You're covering this — you're not in the split." });
          return;
        }

        // Entering cover mode: deselect self
        // Edge case: if only 1 other member, can't enter cover mode
        if (activeMembers.length <= 1) return;

        setActiveIds((prev) => {
          const next = new Set(prev);
          next.delete(memberId);
          // Keep only one other member (most recently in the set)
          const othersInSet = Array.from(next);
          if (othersInSet.length > 1) {
            // Keep the last one
            const keep = othersInSet[othersInSet.length - 1];
            return new Set([keep]);
          }
          return next;
        });

        // Close custom panel, reset to equal
        if (splitMode === "custom") {
          setSplitMode("equal");
          setCustomAmounts(new Map());
          setFocusedMemberId(null);
        }
        return;
      }

      // In cover mode: single-select among non-payer members
      if (isCoverMode) {
        setActiveIds(new Set([memberId]));
        return;
      }

      // Normal split mode toggling
      if (memberId === payerMember?.id) return;

      setActiveIds((prev) => {
        const next = new Set(prev);
        if (next.has(memberId)) {
          if (next.size <= 1) return prev;
          next.delete(memberId);
        } else {
          next.add(memberId);
        }

        if (splitMode === "custom") {
          const newMembers = activeMembers.filter((m) => next.has(m.id));
          const total = parseFloat(amount) || 0;
          setCustomAmounts(distributeEqually(total, newMembers));
          setFocusedMemberId(newMembers[0]?.id ?? null);
        }

        return next;
      });
    },
    [splitMode, amount, activeMembers, distributeEqually, currentUserMemberId, isCoverMode, payerMember, toast]
  );

  // Handle focusing a custom row (also unfocuses total editing)
  const handleFocusRow = useCallback((memberId: string) => {
    setFocusedMemberId(memberId);
    setEditingTotal(false);
    setFreshFocus(true);
  }, []);

  // Continue from Step 1 to Step 2
  const handleContinue = useCallback(() => {
    const currentAmount = amount;
    if (currentAmount !== lastStep2AmountRef.current) {
      // Amount changed since last Step 2 visit — redistribute
      const total = parseFloat(currentAmount) || 0;
      setCustomAmounts(distributeEqually(total, selectedMembers));
    }
    lastStep2AmountRef.current = currentAmount;
    setStep(2);
  }, [amount, selectedMembers, distributeEqually]);

  // Save
  const handleSave = async () => {
    if (!currentGroup || !user || loading) return;
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;

    if (splitMode === "custom" && !isBalanced && !isCoverMode) return;

    // Edit mode: check for settled
    if (isEditMode && editExpense?.is_settled) {
      toast({ title: "This expense has been settled and can't be edited.", variant: "destructive" });
      return;
    }

    // Solo check
    if (!isCoverMode && selectedMembers.length <= 1) return;

    // Edit mode: no-change detection
    if (isEditMode && editExpense && editSplits) {
      const amountChanged = Math.abs(editExpense.amount - numAmount) > 0.001;
      const descChanged = editExpense.description !== (description.trim() || "Quick Expense");
      const oldMemberNames = editSplits.map((s) => s.member_name).sort();
      const newMemberNames = selectedMembers.map((m) => m.name).sort();
      const membersChanged = JSON.stringify(oldMemberNames) !== JSON.stringify(newMemberNames);

      if (!amountChanged && !descChanged && !membersChanged) {
        onOpenChange(false);
        return;
      }
    }

    setLoading(true);
    try {
      const selectedPayer = payerMember ?? activeMembers.find((m) => m.user_id === user.id);
      const paidByUserId = selectedPayer?.user_id ?? null;
      const paidByName = selectedPayer?.name ?? user.email?.split("@")[0] ?? "You";

      const expenseType = isCoverMode ? "cover" : "split";

      let splits: { user_id: string | null; member_name: string; share_amount: number }[];

      if (isCoverMode) {
        // Cover mode: the single covered member gets the full amount
        splits = selectedMembers.map((m) => ({
          user_id: m.user_id,
          member_name: m.name,
          share_amount: numAmount,
        }));
      } else if (splitMode === "equal") {
        const shares = distributeCents(numAmount, selectedMembers.length);
        splits = selectedMembers
          .map((m, i) => ({
            user_id: m.user_id,
            member_name: m.name,
            share_amount: shares[i],
          }))
          .filter((s) => s.share_amount > 0);
      } else {
        splits = selectedMembers
          .map((m) => ({
            user_id: m.user_id,
            member_name: m.name,
            share_amount: parseFloat(customAmounts.get(m.id) || "0") || 0,
          }))
          .filter((s) => s.share_amount > 0);
      }

      if (isEditMode && editExpense) {
        // Edit mode: call edit_expense RPC
        const actorName = profile?.display_name ?? user.email?.split("@")[0] ?? "Unknown";
        const { error: rpcError } = await supabase.rpc("edit_expense", {
          p_expense_id: editExpense.id,
          p_amount: numAmount,
          p_description: description.trim() || "Quick Expense",
          p_splits: splits,
          p_actor_name: actorName,
          p_expense_type: expenseType,
        } as any);

        if (rpcError) throw rpcError;

        await Promise.all([
          fetchExpenses(currentGroup.id),
          fetchExpenseSplits(currentGroup.id),
        ]);

        toast({ title: "Changes saved" });
      } else {
        // Create mode
        const { error: rpcError } = await supabase.rpc("create_expense_with_splits", {
          p_group_id: currentGroup.id,
          p_amount: numAmount,
          p_description: description.trim() || "Quick Expense",
          p_paid_by_user_id: paidByUserId as string,
          p_paid_by_name: paidByName,
          p_created_by: user.id,
          p_splits: splits,
          p_expense_type: expenseType,
        });

        if (rpcError) throw rpcError;

        await fetchExpenseSplits(currentGroup.id);

        if (isFirstExpense) {
          confetti({
            particleCount: 160,
            spread: 100,
            origin: { y: 0.5 },
            colors: ["#E8480A", "#FFFFFF", "#D4D4D4"],
          });
          toast({ title: "First expense logged! 🎉" });
        } else {
          toast({ title: "Expense added ✓" });
        }
      }

      onOpenChange(false);
    } catch (err) {
      toast({
        title: isEditMode ? "Failed to update expense" : "Failed to add expense",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const canSave = totalNum > 0;
  const isSingleUser = selectedMembers.length <= 1 && !isCoverMode;

  if (!open) return null;

  const saveLabel = isEditMode ? "Save changes" : "Save";

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={[0.8]}
      activeSnapPoint={0.8}
      fadeFromIndex={0}
    >
      <DrawerContent className="max-w-[430px] mx-auto flex flex-col" style={{ maxHeight: '80dvh' }}>
        {step === 1 ? (
          /* ================ STEP 1: Amount ================ */
          <div className="flex flex-col h-full">
            {/* Top bar */}
            <div className="flex items-center justify-between px-5 pt-3 pb-1 flex-shrink-0">
              <h2 className="font-sora text-lg font-bold text-foreground">Adding cost</h2>
              <button
                onClick={() => onOpenChange(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-card"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>

            {/* Amount display */}
            <div className="flex-1 flex items-center justify-center">
              <AmountDisplay
                amount={amount}
                splitMode="equal"
                remaining={0}
                isBalanced={false}
              />
            </div>

            {/* Continue button */}
            <div className="px-4 pb-1 flex-shrink-0">
              <button
                onClick={handleContinue}
                disabled={amount === "0"}
                className="w-full rounded-[18px] py-4 font-sora text-[17px] font-extrabold transition-all active:scale-[0.985] flex items-center justify-center gap-2"
                style={{
                  backgroundColor: amount === "0" ? "#EAEAE6" : "hsl(var(--primary))",
                  color: amount === "0" ? "#C0C0BC" : "#FFFFFF",
                  boxShadow: amount === "0" ? "none" : "0 4px 14px rgba(217,79,0,0.3)",
                }}
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* Numpad */}
            <div className="flex-shrink-0" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
              <NumpadGrid onKey={handleKey} />
            </div>
          </div>
        ) : (
          /* ================ STEP 2: Who + How ================ */
          <div className="flex flex-col h-full">
            {/* Top bar */}
            <div className="flex items-center justify-between px-5 pt-3 pb-1 flex-shrink-0">
              <div className="flex items-center gap-2">
                {!isEditMode && (
                  <button
                    onClick={() => setStep(1)}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-card"
                  >
                    <ArrowLeft className="w-5 h-5 text-foreground" />
                  </button>
                )}
                <h2 className="font-sora text-lg font-bold text-foreground">
                  {isEditMode ? "Editing cost" : "Who's splitting?"}
                </h2>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-card"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {/* Compact amount (tappable back to Step 1 in create mode) */}
              {!isEditMode ? (
                <AmountDisplay
                  amount={amount}
                  splitMode={splitMode}
                  remaining={remaining}
                  isBalanced={isBalanced}
                  onDistribute={handleDistribute}
                  canDistribute={canDistribute}
                  compact={splitMode === "equal" && !isCoverMode}
                  onTap={() => setStep(1)}
                />
              ) : (
                <AmountDisplay
                  amount={amount}
                  splitMode={splitMode}
                  remaining={remaining}
                  isBalanced={isBalanced}
                  onDistribute={handleDistribute}
                  canDistribute={canDistribute}
                  compact={splitMode === "equal"}
                />
              )}

              {/* Locked payer label (edit mode) */}
              {isEditMode && editExpense && (
                <button
                  onClick={() => toast({ title: "To change the payer, delete this expense and log a new one" })}
                  className="flex items-center justify-center gap-1.5 mx-auto mb-1 px-3 py-1"
                >
                  <Lock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">
                    Paid by {editExpense.paid_by_user_id === user?.id ? "You" : editExpense.paid_by_name}
                  </span>
                </button>
              )}

              {/* Split sentence */}
              <SplitSentence
                splitMode={splitMode}
                onToggleMode={toggleMode}
                activeMembers={selectedMembers}
                currentUserId={user?.id}
                disabled={amount === "0"}
                isSingleUser={isSingleUser}
                payerMember={payerMember}
                onSetPayer={isEditMode ? () => toast({ title: "To change the payer, delete this expense and log a new one" }) : handleSetPayer}
                allActiveMembers={activeMembers}
                activeIds={activeIds}
                onToggleMember={handleToggleChip}
                hidePayerDrawer={isEditMode}
                isCoverMode={isCoverMode}
                coveredMemberName={coveredMemberName}
              />

              {/* Custom split rows */}
              <CustomSplitRows
                members={selectedMembers}
                currentUserId={user?.id}
                customAmounts={customAmounts}
                focusedMemberId={focusedMemberId}
                shakeMemberId={shakeMemberId}
                onFocus={handleFocusRow}
                visible={splitMode === "custom" && !isCoverMode}
              />
            </div>

            {/* Description input */}
            <div className="px-5 pt-2 pb-1 flex-shrink-0">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Pizza, Rent, Groceries"
                maxLength={50}
                className="w-full text-center text-base font-medium rounded-xl px-4 py-3.5 bg-muted text-foreground placeholder:text-muted-foreground outline-none border-none font-sora"
              />
            </div>

            {/* Save button */}
            <div className="flex-shrink-0" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
              <SaveButton
                splitMode={splitMode}
                canSave={canSave}
                isBalanced={isBalanced}
                loading={loading}
                onClick={handleSave}
                isSingleUser={isSingleUser}
                label={saveLabel}
                isCoverMode={isCoverMode}
              />
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
