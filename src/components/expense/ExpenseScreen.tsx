import { useState, useMemo, useCallback, useEffect } from "react";
import { X, Lock } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { distributeCents } from "@/lib/bountt-utils";
import confetti from "canvas-confetti";
import { GroupMember, Expense, ExpenseSplit } from "@/types";

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

  useEffect(() => {
    setActiveIds(new Set(activeMembers.map((m) => m.id)));
  }, [activeMembers.length]);

  useEffect(() => {
    if (open) {
      if (isEditMode && editExpense && editSplits) {
        // Pre-fill from edit data
        setAmount(String(editExpense.amount));
        setDescription(editExpense.description);
        setSplitMode("equal");
        // Match split member IDs to current group members
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
        // Find the payer member
        const payerM = activeMembers.find(
          (m) => (editExpense.paid_by_user_id && m.user_id === editExpense.paid_by_user_id) ||
            (!editExpense.paid_by_user_id && m.name === editExpense.paid_by_name && m.is_placeholder)
        );
        setPayerId(payerM?.id ?? null);
        setFocusedMemberId(null);
        setCustomAmounts(new Map());
        setEditingTotal(false);
      } else {
        setAmount("0");
        setDescription("");
        setSplitMode("equal");
        setActiveIds(new Set(activeMembers.map((m) => m.id)));
        setFocusedMemberId(null);
        setCustomAmounts(new Map());
        setEditingTotal(false);
        // Default payer to current user's member record
        const selfMember = activeMembers.find((m) => m.user_id === user?.id);
        setPayerId(selfMember?.id ?? null);
      }
    }
  }, [open]);

  // Resolve current payer member; fallback to self if removed
  const payerMember = useMemo(() => {
    const found = activeMembers.find((m) => m.id === payerId);
    if (found) return found;
    return activeMembers.find((m) => m.user_id === user?.id);
  }, [activeMembers, payerId, user?.id]);

  const selectedMembers = useMemo(
    () => activeMembers.filter((m) => activeIds.has(m.id)),
    [activeMembers, activeIds]
  );

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

  // Handle numpad key
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
        // Calculate max this member can have
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
    [splitMode, focusedMemberId, editingTotal, freshFocus, selectedMembers, distributeEqually]
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

  // Toggle chip — payer cannot be unchecked
  const handleToggleChip = useCallback(
    (memberId: string) => {
      // Prevent unchecking the payer
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
    [splitMode, amount, activeMembers, distributeEqually]
  );

  // Handle focusing a custom row (also unfocuses total editing)
  const handleFocusRow = useCallback((memberId: string) => {
    setFocusedMemberId(memberId);
    setEditingTotal(false);
    setFreshFocus(true);
  }, []);

  // Save
  const handleSave = async () => {
    if (!currentGroup || !user || loading) return;
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;

    if (splitMode === "custom" && !isBalanced) return;

    // Edit mode: check for settled
    if (isEditMode && editExpense?.is_settled) {
      toast({ title: "This expense has been settled and can't be edited.", variant: "destructive" });
      return;
    }

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

      let splits: { user_id: string | null; member_name: string; share_amount: number }[];

      if (splitMode === "equal") {
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
  const isSingleUser = selectedMembers.length <= 1;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background max-w-[430px] mx-auto" style={{ height: '100dvh' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-1 flex-shrink-0">
        <h2 className="font-sora text-lg font-bold text-foreground">{isEditMode ? "Editing cost" : "Adding cost"}</h2>
        <button
          onClick={() => onOpenChange(false)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-card"
        >
          <X className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Scrollable middle section */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Amount display */}
        <AmountDisplay
          amount={amount}
          splitMode={splitMode}
          remaining={remaining}
          isBalanced={isBalanced}
          onDistribute={handleDistribute}
          canDistribute={canDistribute}
        />

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
        />

        {/* Custom split rows */}
        <CustomSplitRows
          members={selectedMembers}
          currentUserId={user?.id}
          customAmounts={customAmounts}
          focusedMemberId={focusedMemberId}
          shakeMemberId={shakeMemberId}
          onFocus={handleFocusRow}
          visible={splitMode === "custom"}
        />
      </div>

      {/* Description input - above save */}
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
      <div className="flex-shrink-0">
        <SaveButton
          splitMode={splitMode}
          canSave={canSave}
          isBalanced={isBalanced}
          loading={loading}
          onClick={handleSave}
          isSingleUser={isSingleUser}
          label={isEditMode ? "Save changes" : "Save"}
        />
      </div>

      {/* Numpad - fixed height */}
      <div className="flex-shrink-0" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <NumpadGrid onKey={handleKey} />
      </div>

    </div>
  );
}
