import { useState } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { ArrowRight, Delete } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";

interface ExpenseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
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
  memberName,
  isFirstExpense = false,
}: ExpenseSheetProps) {
  const [amount, setAmount] = useState("0");
  const [loading, setLoading] = useState(false);
  const { currentGroup, user, groupMembers, addExpense, fetchExpenseSplits } = useApp();
  const { toast } = useToast();

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
      if (amount.length >= 9) return; // max length
      setAmount((prev) => prev + key);
    }
  };

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0 || !currentGroup || !user || loading) return;
    setLoading(true);

    try {
      // Insert expense
      const { data: expenseData, error: expenseError } = await supabase
        .from("expenses")
        .insert({
          group_id: currentGroup.id,
          amount: numAmount,
          description: "Quick Expense",
          paid_by_user_id: user.id,
          paid_by_name: "You",
          created_by: user.id,
          is_settled: false,
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      // Insert equal splits for all members
      const memberCount = groupMembers.length;
      const shareAmount = Math.round((numAmount / memberCount) * 100) / 100;

      const splits = groupMembers.map((m) => ({
        expense_id: expenseData.id,
        user_id: m.user_id,
        member_name: m.name,
        share_amount: shareAmount,
      }));

      const { error: splitsError } = await supabase
        .from("expense_splits")
        .insert(splits);

      if (splitsError) throw splitsError;

      // Refresh splits in context
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

      setAmount("0");
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
          <p className="text-sm text-muted-foreground text-center mb-6">
            Splitting equally with <span className="text-primary font-medium">{memberName.toLowerCase()}</span>
          </p>

          {/* Amount display */}
          <div className="flex items-baseline justify-center mb-8">
            <span className="text-2xl text-muted-foreground mr-1">$</span>
            <span className="text-5xl font-bold text-foreground">{displayAmount}</span>
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
