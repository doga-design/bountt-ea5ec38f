import { Expense, ExpenseSplit } from "@/types";

// 6-color avatar palette
const AVATAR_COLORS = [
  "#3B82F6", // Blue
  "#EC4899", // Pink
  "#10B981", // Green
  "#F97316", // Orange
  "#8B5CF6", // Purple
  "#14B8A6", // Teal
];

/**
 * Deterministic color assignment based on member ID hash.
 * Same member always gets the same color.
 */
export function getAvatarColor(memberId: string): string {
  let hash = 0;
  for (let i = 0; i < memberId.length; i++) {
    hash = memberId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export interface MemberBalance {
  amount: number;
  direction: "you_pay" | "they_pay" | "settled";
}

/**
 * Calculate the net financial relationship between the current user
 * and a specific member.
 *
 * - theyOweYou = sum of member's split amounts on expenses YOU paid (unsettled)
 * - youOweThem = sum of YOUR split amounts on expenses THEY paid (unsettled)
 * - net = theyOweYou - youOweThem
 */
export function getMemberBalance(
  memberId: string,
  memberUserId: string | null,
  memberName: string,
  expenses: Expense[],
  splits: ExpenseSplit[],
  currentUserId: string
): MemberBalance {
  let theyOweYou = 0;
  let youOweThem = 0;

  for (const expense of expenses) {
    if (expense.is_settled) continue;

    const expenseSplits = splits.filter((s) => s.expense_id === expense.id);

    // Case 1: Current user paid → check if member has a split
    if (expense.paid_by_user_id === currentUserId) {
      for (const split of expenseSplits) {
        const isThisMember =
          (memberUserId && split.user_id === memberUserId) ||
          (!memberUserId && split.member_name === memberName && !split.user_id);
        if (isThisMember) {
          theyOweYou += Number(split.share_amount);
        }
      }
    }

    // Case 2: Member paid → check if current user has a split
    const memberPaid =
      (memberUserId && expense.paid_by_user_id === memberUserId) ||
      (!memberUserId && expense.paid_by_name === memberName && !expense.paid_by_user_id);
    if (memberPaid) {
      for (const split of expenseSplits) {
        if (split.user_id === currentUserId) {
          youOweThem += Number(split.share_amount);
        }
      }
    }
  }

  const net = theyOweYou - youOweThem;

  if (Math.abs(net) < 0.01) {
    return { amount: 0, direction: "settled" };
  }
  if (net > 0) {
    return { amount: net, direction: "they_pay" };
  }
  return { amount: Math.abs(net), direction: "you_pay" };
}
