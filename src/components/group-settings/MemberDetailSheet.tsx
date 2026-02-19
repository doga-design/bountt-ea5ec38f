import { Ghost, User, Send, Pencil, Trash2, ArrowRight, HandCoins } from "lucide-react";
import { GroupMember, Expense, ExpenseSplit } from "@/types";
import { getAvatarColor, getMemberBalance } from "@/lib/avatar-utils";
import { formatCurrency } from "@/lib/bountt-utils";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface MemberDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: GroupMember | null;
  expenses: Expense[];
  splits: ExpenseSplit[];
  currentUserId: string;
  isAdmin: boolean;
  onRemove?: () => void;
}

export default function MemberDetailSheet({
  open,
  onOpenChange,
  member,
  expenses,
  splits,
  currentUserId,
  isAdmin,
  onRemove,
}: MemberDetailSheetProps) {
  if (!member) return null;

  const isPlaceholder = member.is_placeholder;
  const avatarColor = isPlaceholder ? undefined : getAvatarColor(member.id);
  const balance = getMemberBalance(
    member.id,
    member.user_id,
    member.name,
    expenses,
    splits,
    currentUserId
  );

  // Get shared expenses
  const sharedExpenses = expenses.filter((exp) => {
    if (exp.is_settled) return false;
    const hasSplit = splits.some(
      (s) =>
        s.expense_id === exp.id &&
        ((member.user_id && s.user_id === member.user_id) ||
          (!member.user_id && s.member_name === member.name && !s.user_id))
    );
    return hasSplit;
  });

  const balanceText = (() => {
    if (balance.direction === "settled") return "All settled up";
    if (balance.direction === "you_pay") return `You owe ${member.name}`;
    return `${member.name} owes you`;
  })();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={isPlaceholder ? { backgroundColor: "hsl(var(--muted))" } : { backgroundColor: avatarColor }}
            >
              {isPlaceholder ? (
                <span className="text-xl">👻</span>
              ) : (
                <User className="w-6 h-6 text-primary-foreground" />
              )}
            </div>
            <div>
              <DrawerTitle>{member.name}</DrawerTitle>
              <div className="flex items-center gap-2 mt-1">
                {isPlaceholder ? (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                    Not on Bountt yet
                  </span>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      Active
                    </span>
                    {member.role === "admin" && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                        Admin
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-8 space-y-5">
          {/* Balance summary */}
          <div className="bg-muted/50 rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{balanceText}</p>
            <p className={`text-2xl font-bold ${
              balance.direction === "settled"
                ? "text-muted-foreground"
                : balance.direction === "you_pay"
                ? "text-destructive"
                : "text-emerald-600"
            }`}>
              {balance.direction === "settled" ? "✓" : formatCurrency(balance.amount)}
            </p>
          </div>

          {/* Shared expenses list */}
          {sharedExpenses.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Shared expenses
              </p>
              <div className="space-y-2">
                {sharedExpenses.slice(0, 5).map((exp) => {
                  const split = splits.find(
                    (s) =>
                      s.expense_id === exp.id &&
                      ((member.user_id && s.user_id === member.user_id) ||
                        (!member.user_id && s.member_name === member.name && !s.user_id))
                  );
                  return (
                    <div key={exp.id} className="flex items-center justify-between bg-card rounded-lg p-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{exp.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {exp.paid_by_name} paid {formatCurrency(exp.amount)}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {split ? formatCurrency(split.share_amount) : "—"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            {isPlaceholder ? (
              <>
                <Button className="w-full gap-2" size="lg">
                  <Send className="w-4 h-4" /> Invite to Bountt
                </Button>
                <Button variant="outline" className="w-full gap-2" size="lg">
                  <Pencil className="w-4 h-4" /> Edit Name
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="w-full gap-2" size="lg">
                  <ArrowRight className="w-4 h-4" /> View Shared Expenses
                </Button>
                <Button variant="outline" className="w-full gap-2" size="lg">
                  <HandCoins className="w-4 h-4" /> Settle Up
                </Button>
              </>
            )}
            {isAdmin && member.user_id !== currentUserId && (
              <Button
                variant="ghost"
                className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                size="lg"
                onClick={onRemove}
              >
                <Trash2 className="w-4 h-4" /> Remove from Group
              </Button>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
