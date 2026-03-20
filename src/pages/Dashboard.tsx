import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/contexts/AppContext";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import HeroCarousel from "@/components/dashboard/HeroCarousel";
import EmptyState from "@/components/dashboard/EmptyState";
import AddExpensePrompt from "@/components/dashboard/AddExpensePrompt";
import ExpenseScreen from "@/components/expense/ExpenseScreen";
import ExpenseFeedItem from "@/components/dashboard/ExpenseFeedItem";
import ExpenseDetailSheet from "@/components/dashboard/ExpenseDetailSheet";
import MemberAvatarRow from "@/components/dashboard/MemberAvatarRow";
import BottomNav from "@/components/BottomNav";
import { formatRelativeDate } from "@/lib/bountt-utils";
import { Expense, ExpenseSplit } from "@/types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import confetti from "canvas-confetti";

export default function Dashboard() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    setCurrentGroup,
    userGroups,
    currentGroup,
    groupMembers,
    expenses,
    expenseSplits,
    user,
    membersLoading,
    
    groupsLoading,
  } = useApp();

  const [sheetOpen, setSheetOpen] = useState(false);
  // Store ID instead of full object so we always derive from live data
  const [detailExpenseId, setDetailExpenseId] = useState<string | null>(null);
  const [editExpense, setEditExpense] = useState<Expense | undefined>(undefined);
  const [editSplits, setEditSplits] = useState<ExpenseSplit[] | undefined>(undefined);

  // Confetti: only fire after drawer fully closes
  const pendingConfettiRef = useRef(false);

  // Derive live expense from expenses array
  const detailExpense = detailExpenseId
    ? expenses.find((e) => e.id === detailExpenseId) ?? null
    : null;

  const detailOpen = detailExpenseId !== null;

  // Called by ExpenseDetailSheet when it auto-closes due to full settlement
  const handleSettlementComplete = useCallback(() => {
    pendingConfettiRef.current = true;
  }, []);

  // Called when the drawer open state changes
  const handleDetailOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setDetailExpenseId(null);
      // Fire confetti after drawer close animation completes
      if (pendingConfettiRef.current) {
        pendingConfettiRef.current = false;
        // Use requestAnimationFrame to ensure drawer is fully gone
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Multi-burst full-viewport confetti
            const defaults = { origin: { y: 0.4 }, zIndex: 9999 };
            confetti({ ...defaults, particleCount: 80, spread: 100, angle: 60 });
            confetti({ ...defaults, particleCount: 80, spread: 100, angle: 120 });
            confetti({ ...defaults, particleCount: 60, spread: 140, angle: 90 });
          });
        });
      }
    }
  }, []);

  // ... keep existing code
  useEffect(() => {
    if (groupId) {
      const group = userGroups.find((g) => g.id === groupId);
      if (group) {
        setCurrentGroup(group);
        localStorage.setItem("bountt_last_group_id", groupId);
      }
    }
  }, [groupId, userGroups]);

  useEffect(() => {
    if (groupId && !groupsLoading && userGroups.length >= 0) {
      const found = userGroups.find((g) => g.id === groupId);
      if (!found && !groupsLoading) {
        const timer = setTimeout(() => {
          if (!userGroups.find((g) => g.id === groupId)) {
            navigate("/");
            toast({ title: "Group not found or you're no longer a member" });
          }
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [groupId, userGroups, groupsLoading]);

  const otherMembers = groupMembers.filter((m) => m.user_id !== user?.id);
  const hasOtherMembers = otherMembers.length > 0;
  const hasExpenses = expenses.length > 0;
  const latestMemberName = otherMembers[otherMembers.length - 1]?.name ?? "";

  const isLoading = membersLoading || expensesLoading;

  const { unsettledGroups, settledExpenses } = useMemo(() => {
    const unsettled = expenses.filter((e) => !e.is_settled);
    const settled = expenses.filter((e) => e.is_settled);

    const groups: { label: string; items: typeof expenses }[] = [];
    let currentLabel = "";
    for (const expense of unsettled) {
      const label = formatRelativeDate(expense.date);
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, items: [] });
      }
      groups[groups.length - 1].items.push(expense);
    }
    return { unsettledGroups: groups, settledExpenses: settled };
  }, [expenses]);

  const groupReady = currentGroup && currentGroup.id === groupId;
  const mode = !hasOtherMembers ? "empty" : !hasExpenses ? "prompt" : "normal";

  return (
    <div className="screen-container">
      {!groupReady || isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {mode === "normal" ? (
            <HeroCarousel />
          ) : (
            <DashboardHeader onAddMember={undefined} showBalance={false} />
          )}

          {mode === "empty" && <EmptyState />}

          {mode === "prompt" && (
            <AddExpensePrompt
              memberName={latestMemberName}
              onAddExpense={() => setSheetOpen(true)}
            />
          )}

          {mode === "normal" && (
            <>
              <div className="mt-4">
                <MemberAvatarRow
                  members={groupMembers}
                  currentUserId={user?.id ?? ""}
                  groupInviteCode={currentGroup?.invite_code}
                />
              </div>

              <div className="flex-1 px-4 py-4 space-y-4 pb-24">
                {unsettledGroups.map((group, idx) => (
                  <div key={group.label}>
                    {idx > 0 && <div className="border-t border-border mb-3" />}
                    <p className="text-xs font-medium text-muted-foreground tracking-wider mb-2 px-1">
                      {group.label}
                    </p>
                    <div className="divide-y divide-border">
                      {group.items.map((expense) => (
                        <ExpenseFeedItem
                          key={expense.id}
                          expense={expense}
                          splits={expenseSplits.filter((s) => s.expense_id === expense.id)}
                          groupMembers={groupMembers}
                          onClick={() => setDetailExpenseId(expense.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                {settledExpenses.length > 0 && (
                  <Collapsible>
                    <div className="border-t border-border mb-3" />
                    <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground tracking-wider px-1 mb-2 w-full">
                      SETTLED
                      <ChevronDown className="w-3.5 h-3.5" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="divide-y divide-border">
                        {settledExpenses.map((expense) => (
                          <ExpenseFeedItem
                            key={expense.id}
                            expense={expense}
                            splits={expenseSplits.filter((s) => s.expense_id === expense.id)}
                            groupMembers={groupMembers}
                            onClick={() => setDetailExpenseId(expense.id)}
                          />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>

              <BottomNav onFabPress={() => setSheetOpen(true)} />

              <ExpenseDetailSheet
                open={detailOpen}
                onOpenChange={handleDetailOpenChange}
                expense={detailExpense}
                splits={expenseSplits}
                groupMembers={groupMembers}
                onSettled={handleSettlementComplete}
                onEdit={(exp, splits) => {
                  setEditExpense(exp);
                  setEditSplits(splits);
                  setSheetOpen(true);
                }}
              />
            </>
          )}
        </>
      )}

      {/* ALWAYS mounted — never unmounted by loading states */}
      <ExpenseScreen
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) {
            setEditExpense(undefined);
            setEditSplits(undefined);
          }
        }}
        editExpense={editExpense}
        editSplits={editSplits}
        isFirstExpense={mode === "prompt"}
      />
    </div>
  );
}
