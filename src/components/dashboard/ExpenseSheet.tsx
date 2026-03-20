import { useState, useEffect } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { ArrowRight, Delete } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { distributeCents } from "@/lib/bountt-utils";
import confetti from "canvas-confetti";
import { Expense } from "@/types";

interface ExpenseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFirstExpense?: boolean;
}

const NUMPAD_KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "del"],
];

export default function ExpenseSheet({
  open,
  onOpenChange,
  isFirstExpense = false,
}: ExpenseSheetProps) {
  const [amount, setAmount] = useState("0");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedPayerIdx, setSelectedPayerIdx] = useState(0);
  const { currentGroup, user, groupMembers, fetchExpenseSplits } = useApp();
  const { toast } = useToast();

  // Bug 1 fix: Only show active members in numpad
  const activeMembers = groupMembers.filter((m) => m.status === "active");
  const sortedMembers = [...activeMembers].sort((a, b) => {
    if (a.user_id === user?.id) return -1;
    if (b.user_id === user?.id) return 1;
    return 0;
  });

  // Fix 7: Reset payer index when member list changes
  useEffect(() => {
    setSelectedPayerIdx(0);
  }, [sortedMembers.length]);

  const handleKey = (key: string) => {
    if (key === "del") {
      setAmount((prev) => (prev.length <= 1 ? "0" : prev.slice(0, -1)));
      return;
    }
    if (key === "." && amount.includes(".")) return;
    const decimals = amount.split(".")[1];
    if (decimals && decimals.length >= 2) return;

    if (amount === "0" && key !== ".") {
      setAmount(key);
    } else {
      if (amount.length >= 9) return;
      setAmount((prev) => prev + key);
    }
  };

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0 || !currentGroup || !user || loading) return;
    setLoading(true);

    try {
      const payer = sortedMembers[selectedPayerIdx] ?? sortedMembers[0];

      // Cent-distribution algorithm for perfect splits
      const shares = distributeCents(numAmount, sortedMembers.length);

      const splits = sortedMembers.map((m, i) => ({
        user_id: m.user_id,
        member_name: m.name,
        share_amount: shares[i],
      }));

      // Fix 1: Atomic expense + splits via RPC
      const { data: expenseData, error: rpcError } = await supabase
        .rpc("create_expense_with_splits", {
          p_group_id: currentGroup.id,
          p_amount: numAmount,
          p_description: description.trim() || "Quick Expense",
          p_paid_by_user_id: payer.user_id,
          p_paid_by_name: payer.name,
          p_splits: splits,
        });

      if (rpcError) throw rpcError;

      // Parse the returned expense JSONB and add to local state (dedup via realtime)
      if (expenseData) {
        const newExpense = expenseData as unknown as Expense;
        // Splits will be synced via realtime re-fetch triggered by expense INSERT event
      }

      await fetchExpenseSplits(currentGroup.id);

      if (isFirstExpense) {
        confetti({
          particleCount: 120,
          spread: 100,
          origin: { y: 0.5 },
          colors: ["#E8480A", "#FFFFFF", "#D4D4D4"],
        });
        toast({ title: "First expense logged!" });
      } else {
        toast({ title: "Expense added" });
      }

      setAmount("0");
      setDescription("");
      setSelectedPayerIdx(0);
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

  const displayAmount = amount === "0" ? "0" : amount;
  const numAmount = parseFloat(amount);
  const canSubmit = numAmount > 0 && !loading;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-[430px] mx-auto">
        <div className="px-6 pt-4 pb-8">
          {/* Title */}
          <h3 className="text-lg font-bold text-foreground text-center mb-1">
            What did you pay for?
          </h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            Split equally among{" "}
            <span className="text-primary font-medium">{sortedMembers.length} people</span>
          </p>

          {/* Who paid? selector */}
          <div className="mb-6">
            <p className="text-xs text-muted-foreground text-center mb-2">Who paid?</p>
            <div className="flex gap-2 overflow-x-auto justify-center">
              {sortedMembers.map((m, i) => {
                const isSelf = m.user_id === user?.id;
                const memberColor = isSelf ? getAvatarColor(m).bg : undefined;
                const selected = i === selectedPayerIdx;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedPayerIdx(i)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isSelf ? "You" : m.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount display */}
          <div className="flex items-baseline justify-center mb-4">
            <span className="text-2xl text-muted-foreground mr-1">$</span>
            <span className="text-5xl font-bold text-foreground">{displayAmount}</span>
          </div>

          {/* Description input */}
          <div className="mb-6">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 50))}
              placeholder="e.g., Pizza, Rent, Groceries"
              className="w-full text-center text-sm text-foreground bg-muted rounded-xl px-4 py-3 outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {NUMPAD_KEYS.flat().map((key) => (
              <button
                key={key}
                onClick={() => handleKey(key)}
                className="h-14 rounded-xl bg-muted flex items-center justify-center text-xl font-semibold text-foreground active:scale-95 transition-transform"
                aria-label={key === "del" ? "Delete" : key}
              >
                {key === "del" ? <Delete className="w-5 h-5" /> : key}
              </button>
            ))}
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full rounded-full py-4 flex items-center justify-center gap-2 font-semibold text-base transition-all ${
              canSubmit
                ? "bg-primary text-primary-foreground active:scale-[0.97]"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Continue
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
