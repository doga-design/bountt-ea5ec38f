import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import EmptyState from "@/components/dashboard/EmptyState";
import AddExpensePrompt from "@/components/dashboard/AddExpensePrompt";
import ExpenseSheet from "@/components/dashboard/ExpenseSheet";
import ExpenseCard from "@/components/dashboard/ExpenseCard";
import MemberCardScroll from "@/components/dashboard/MemberCardScroll";
import BottomNav from "@/components/BottomNav";
import { formatRelativeDate } from "@/lib/bountt-utils";
import { GroupMember } from "@/types";
import MemberDetailSheet from "@/components/group-settings/MemberDetailSheet";

export default function Dashboard() {
  const { groupId } = useParams<{ groupId: string }>();
  const {
    setCurrentGroup,
    userGroups,
    currentGroup,
    groupMembers,
    expenses,
    expenseSplits,
    user,
    membersLoading,
    expensesLoading,
    removeMember,
  } = useApp();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);

  useEffect(() => {
    if (groupId) {
      const group = userGroups.find((g) => g.id === groupId);
      if (group) setCurrentGroup(group);
    }
  }, [groupId, userGroups]);

  const otherMembers = groupMembers.filter((m) => m.user_id !== user?.id);
  const hasOtherMembers = otherMembers.length > 0;
  const hasExpenses = expenses.length > 0;
  const latestMemberName = otherMembers[otherMembers.length - 1]?.name ?? "";

  const isLoading = membersLoading || expensesLoading;
  const isAdmin = currentGroup?.created_by === user?.id;

  const groupedExpenses = useMemo(() => {
    const groups: { label: string; items: typeof expenses }[] = [];
    let currentLabel = "";
    for (const expense of expenses) {
      const label = formatRelativeDate(expense.date);
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, items: [] });
      }
      groups[groups.length - 1].items.push(expense);
    }
    return groups;
  }, [expenses]);

  if (isLoading && !hasOtherMembers && !hasExpenses) {
    return (
      <div className="screen-container items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const mode = !hasOtherMembers ? "empty" : !hasExpenses ? "prompt" : "normal";

  return (
    <div className="screen-container">
      <DashboardHeader
        onAddMember={undefined}
        showBalance={mode === "normal"}
      />

      {mode === "empty" && <EmptyState />}

      {mode === "prompt" && (
        <>
          <AddExpensePrompt
            memberName={latestMemberName}
            onAddExpense={() => setSheetOpen(true)}
          />
          <ExpenseSheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            isFirstExpense
          />
        </>
      )}

      {mode === "normal" && (
        <>
          {/* Member cards horizontal scroll */}
          <div className="mt-8">
            <MemberCardScroll
              members={groupMembers}
              expenses={expenses}
              splits={expenseSplits}
              currentUserId={user?.id ?? ""}
              onCardClick={setSelectedMember}
            />
          </div>

          <div className="flex-1 px-4 py-4 space-y-4 pb-24">
            {groupedExpenses.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
                  {group.label}
                </p>
                <div className="space-y-3">
                  {group.items.map((expense) => (
                    <ExpenseCard
                      key={expense.id}
                      expense={expense}
                      splits={expenseSplits.filter((s) => s.expense_id === expense.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <BottomNav onFabPress={() => setSheetOpen(true)} />
          <ExpenseSheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
          />

          <MemberDetailSheet
            open={!!selectedMember}
            onOpenChange={(o) => !o && setSelectedMember(null)}
            member={selectedMember}
            expenses={expenses}
            splits={expenseSplits}
            currentUserId={user?.id ?? ""}
            isAdmin={isAdmin}
            onRemove={async () => {
              if (selectedMember) {
                await removeMember(selectedMember.id);
                setSelectedMember(null);
              }
            }}
          />
        </>
      )}
    </div>
  );
}
