import { Expense, ExpenseSplit, GroupMember } from "@/types";
import Avatar1 from "@/assets/avatars/avatar1.png";
import Avatar2 from "@/assets/avatars/avatar2.png";
import Avatar3 from "@/assets/avatars/avatar3.png";
import Avatar4 from "@/assets/avatars/avatar4.png";
import Avatar5 from "@/assets/avatars/avatar5.png";

const AVATAR_IMAGES = [Avatar1, Avatar2, Avatar3, Avatar4, Avatar5];

/**
 * Returns a deterministic avatar image for a member based on their ID hash.
 */
export function getAvatarImage(member: GroupMember): string {
  return AVATAR_IMAGES[parseInt(member.id.replace(/-/g, '').slice(0, 8), 16) % AVATAR_IMAGES.length];
}

/**
 * Returns a deterministic avatar image based on a name string (for historical snapshots).
 */
export function getAvatarImageFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_IMAGES[Math.abs(hash) % AVATAR_IMAGES.length];
}

// 10-color avatar palette
const AVATAR_COLORS = [
  "#3B82F6", // Blue
  "#EC4899", // Pink
  "#10B981", // Green
  "#F97316", // Orange
  "#8B5CF6", // Purple
  "#14B8A6", // Teal
  "#EF4444", // Red
  "#F59E0B", // Amber
  "#6366F1", // Indigo
  "#F43F5E", // Rose
];

/**
 * Returns the member's stored avatar_color, falling back to hash-based for un-migrated rows.
 */
export function getAvatarColor(member: GroupMember): string {
  if (member.avatar_color) return member.avatar_color;
  // Fallback: hash-based for old rows without avatar_color
  let hash = 0;
  for (let i = 0; i < member.id.length; i++) {
    hash = member.id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/**
 * Pick a color not yet used by existing group members.
 * Falls back to random if all 10 are taken.
 */
export function pickAvailableColor(existingColors: string[]): string {
  const used = new Set(existingColors);
  const available = AVATAR_COLORS.filter((c) => !used.has(c));
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
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
