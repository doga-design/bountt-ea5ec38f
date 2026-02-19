import { Expense, BalanceSummary, SmartMatchSuggestion } from "@/types";

// =====================================================
// INVITE CODE GENERATION
// =====================================================

/**
 * Generates a unique Bountt invite code in BNTT-XXXX format
 * XXXX = 4 uppercase alphanumeric characters
 */
export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars: 0,O,1,I
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `BNTT-${code}`;
}

/**
 * Generates the full shareable join URL for a group invite
 */
export function generateJoinUrl(inviteCode: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/join/${inviteCode}`;
}

// =====================================================
// CURRENCY FORMATTING
// =====================================================

/**
 * Formats a number as currency string
 * e.g. 42.5 → "$42.50"
 */
export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// =====================================================
// DATE FORMATTING
// =====================================================

/**
 * Formats a date string as human-friendly relative date
 * e.g. "Today", "Yesterday", "Last Week", "Jan 15"
 */
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffMs = today.getTime() - target.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 7) return "Last Week";
  if (diffDays <= 14) return "2 Weeks Ago";

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// =====================================================
// EXPENSE VALIDATION
// =====================================================

/**
 * Validates an expense amount string
 * Must be a positive number with at most 2 decimal places
 */
export function validateExpenseAmount(value: string): boolean {
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0) return false;
  if (num > 999999.99) return false;
  // Check for at most 2 decimal places
  const decimalParts = value.split(".");
  if (decimalParts.length > 1 && decimalParts[1].length > 2) return false;
  return true;
}

// =====================================================
// BALANCE CALCULATION
// =====================================================

/**
 * Calculates the net balance for each member across all expenses
 * Positive = they are owed money
 * Negative = they owe money
 */
export function calculateNetBalance(
  expenses: Expense[],
  userId: string
): number {
  let balance = 0;

  for (const expense of expenses) {
    if (expense.is_settled) continue;
    // If this user paid, they're owed money
    if (expense.paid_by_user_id === userId) {
      balance += expense.amount;
    }
  }

  return balance;
}

/**
 * Calculates balances for all members in a group
 */
export function calculateBalances(expenses: Expense[]): BalanceSummary[] {
  const balanceMap = new Map<string, BalanceSummary>();

  for (const expense of expenses) {
    if (expense.is_settled) continue;

    const key = expense.paid_by_user_id ?? expense.paid_by_name;
    if (!balanceMap.has(key)) {
      balanceMap.set(key, {
        userId: expense.paid_by_user_id,
        memberName: expense.paid_by_name,
        netBalance: 0,
      });
    }

    const entry = balanceMap.get(key)!;
    entry.netBalance += expense.amount;
  }

  return Array.from(balanceMap.values());
}

// =====================================================
// SMART MATCH DETECTION
// =====================================================

/**
 * Detects whether two expenses might "call it even"
 * Returns true if the net difference is within the threshold
 * STUBBED for Phase 1 — full logic in Phase 2
 */
export function detectSmartMatch(
  expense1: Expense,
  expense2: Expense,
  thresholdPercent = 0.1
): SmartMatchSuggestion | null {
  // Only match unsettled expenses between the same group
  if (expense1.group_id !== expense2.group_id) return null;
  if (expense1.is_settled || expense2.is_settled) return null;

  // Check if payers are different (reciprocal relationship needed)
  if (expense1.paid_by_user_id === expense2.paid_by_user_id) return null;

  const netDifference = Math.abs(expense1.amount - expense2.amount);
  const larger = Math.max(expense1.amount, expense2.amount);
  const differenceRatio = netDifference / larger;

  const canCallItEven = differenceRatio <= thresholdPercent;

  return {
    expense1,
    expense2,
    netDifference,
    canCallItEven,
  };
}

// =====================================================
// PLACEHOLDER MEMBER UTILITIES
// =====================================================

/**
 * Generates a display-friendly name for a placeholder member
 */
export function getPlaceholderDisplayName(name: string): string {
  return name.trim();
}

/**
 * Checks if a member is a placeholder (not yet a real user)
 */
export function isPlaceholderMember(member: { is_placeholder: boolean }): boolean {
  return member.is_placeholder;
}
