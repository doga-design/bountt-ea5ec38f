import { useState, useMemo, useCallback, useEffect } from "react";
import { X } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { distributeCents } from "@/lib/bountt-utils";
import confetti from "canvas-confetti";
import { GroupMember } from "@/types";

import MemberChipSelector from "./MemberChipSelector";
import AmountDisplay from "./AmountDisplay";
import SplitSentence from "./SplitSentence";
import CustomSplitRows from "./CustomSplitRows";
import NumpadGrid from "./NumpadGrid";
import SaveButton from "./SaveButton";
import AddMemberSheet from "@/components/group-settings/AddMemberSheet";

interface ExpenseScreenProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFirstExpense?: boolean;
}

export default function ExpenseScreen({
  open,
  onOpenChange,
  isFirstExpense = false,
}: ExpenseScreenProps) {
  const { currentGroup, user, groupMembers, fetchExpenseSplits, addPlaceholderMember } = useApp();
  const { toast } = useToast();

  const [amount, setAmount] = useState("0");
  const [description, setDescription] = useState("");
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set());
  const [focusedMemberId, setFocusedMemberId] = useState<string | null>(null);
  const [customAmounts, setCustomAmounts] = useState<Map<string, string>>(new Map());
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingTotal, setEditingTotal] = useState(false);
  const [freshFocus, setFreshFocus] = useState(false);

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

  useEffect(() => {
    setActiveIds(new Set(activeMembers.map((m) => m.id)));
  }, [activeMembers.length]);

  useEffect(() => {
    if (open) {
      setAmount("0");
      setDescription("");
      setSplitMode("equal");
      setActiveIds(new Set(activeMembers.map((m) => m.id)));
      setFocusedMemberId(null);
      setCustomAmounts(new Map());
      setEditingTotal(false);
    }
  }, [open]);

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

  // Custom mode math
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
        if (freshFocus) {
          setFreshFocus(false);
          setCustomAmounts((prev) => {
            const next = new Map(prev);
            if (key === "del") {
              next.set(focusedMemberId!, "0");
            } else if (key === ".") {
              next.set(focusedMemberId!, "0.");
            } else {
              next.set(focusedMemberId!, key);
            }
            return next;
          });
          return;
        }
        setCustomAmounts((prev) => {
          const next = new Map(prev);
          const current = next.get(focusedMemberId!) ?? "0";
          const newVal = updateField(current);
          if (parseFloat(newVal) < 0) return prev;
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
      setEditingTotal(false);
    } else {
      setSplitMode("equal");
      setCustomAmounts(new Map());
      setFocusedMemberId(null);
      setEditingTotal(false);
    }
  }, [splitMode, amount, selectedMembers, distributeEqually]);

  // Toggle chip
  const handleToggleChip = useCallback(
    (memberId: string) => {
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

    setLoading(true);
    try {
      const selfMember = activeMembers.find((m) => m.user_id === user.id);
      const payerName = selfMember?.name ?? user.email?.split("@")[0] ?? "You";

      let splits: { user_id: string | null; member_name: string; share_amount: number }[];

      if (splitMode === "equal") {
        const shares = distributeCents(numAmount, selectedMembers.length);
        splits = selectedMembers.map((m, i) => ({
          user_id: m.user_id,
          member_name: m.name,
          share_amount: shares[i],
        }));
      } else {
        splits = selectedMembers.map((m) => ({
          user_id: m.user_id,
          member_name: m.name,
          share_amount: parseFloat(customAmounts.get(m.id) || "0") || 0,
        }));
      }

      const { error: rpcError } = await supabase.rpc("create_expense_with_splits", {
        p_group_id: currentGroup.id,
        p_amount: numAmount,
        p_description: description.trim() || "Quick Expense",
        p_paid_by_user_id: user.id,
        p_paid_by_name: payerName,
        p_created_by: user.id,
        p_splits: splits,
      });

      if (rpcError) throw rpcError;

      await fetchExpenseSplits(currentGroup.id);

      if (isFirstExpense) {
        confetti({
          particleCount: 120,
          spread: 100,
          origin: { y: 0.5 },
          colors: ["#E8480A", "#FFFFFF", "#D4D4D4"],
        });
        toast({ title: "First expense logged! 🎉" });
      } else {
        toast({ title: "Expense added ✓" });
      }

      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Failed to add expense",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle add member
  const handleAddMember = async (name: string) => {
    if (!currentGroup) return;
    const newMember = await addPlaceholderMember(currentGroup.id, name);
    if (newMember) {
      setActiveIds((prev) => {
        const next = new Set(prev);
        next.add(newMember.id);
        return next;
      });
      if (splitMode === "custom") {
        setTimeout(() => {
          const total = parseFloat(amount) || 0;
          const allActive = [...activeMembers, newMember].filter(
            (m) => activeIds.has(m.id) || m.id === newMember.id
          );
          setCustomAmounts(distributeEqually(total, allActive));
          setFocusedMemberId(newMember.id);
        }, 100);
      }
    }
  };

  const canSave = totalNum > 0;
  const isSingleUser = selectedMembers.length <= 1;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background max-w-[430px] mx-auto" style={{ height: '100dvh' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-1 flex-shrink-0">
        <h2 className="font-sora text-lg font-bold text-foreground">Adding cost</h2>
        <button
          onClick={() => onOpenChange(false)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-card"
        >
          <X className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Scrollable middle section */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Member chips */}
        <MemberChipSelector
          members={activeMembers}
          activeIds={activeIds}
          currentUserId={user?.id}
          onToggle={handleToggleChip}
          onAddPress={() => setAddMemberOpen(true)}
        />

        {/* Amount display */}
        <AmountDisplay
          amount={amount}
          splitMode={splitMode}
          remaining={remaining}
          isBalanced={isBalanced}
          onDistribute={handleDistribute}
          canDistribute={canDistribute}
        />

        {/* Split sentence */}
        <SplitSentence
          splitMode={splitMode}
          onToggleMode={toggleMode}
          activeMembers={selectedMembers}
          currentUserId={user?.id}
          disabled={amount === "0"}
          isSingleUser={isSingleUser}
        />

        {/* Custom split rows */}
        <CustomSplitRows
          members={selectedMembers}
          currentUserId={user?.id}
          customAmounts={customAmounts}
          focusedMemberId={focusedMemberId}
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
        />
      </div>

      {/* Numpad - fixed height */}
      <div className="flex-shrink-0" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <NumpadGrid onKey={handleKey} />
      </div>

      {/* Add member sheet */}
      <AddMemberSheet
        open={addMemberOpen}
        onOpenChange={setAddMemberOpen}
        groupName={currentGroup?.name ?? "Group"}
        onAdd={handleAddMember}
      />
    </div>
  );
}
