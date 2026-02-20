import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/contexts/AppContext";
import { Loader2, AlertTriangle } from "lucide-react";

interface PlaceholderInfo {
  id: string;
  name: string;
  groupId: string;
  groupName: string;
  expenseCount: number;
  totalAmount: number;
}

export default function Join() {
  const { inviteCode: paramCode } = useParams<{ inviteCode?: string }>();
  const [searchParams] = useSearchParams();
  const placeholderId = searchParams.get("placeholder");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, fetchGroups, profile } = useApp();

  const [code, setCode] = useState(paramCode ?? "");
  const [loading, setLoading] = useState(false);
  const [confirmingMerge, setConfirmingMerge] = useState(false);
  const [placeholderInfo, setPlaceholderInfo] = useState<PlaceholderInfo | null>(null);
  const [groupData, setGroupData] = useState<{ id: string; name: string } | null>(null);

  const userName = profile?.display_name ?? user?.email?.split("@")[0] ?? "";
  const namesMismatch =
    placeholderInfo && userName &&
    placeholderInfo.name.toLowerCase() !== userName.toLowerCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate("/auth", { state: { from: `${window.location.pathname}${window.location.search}` } });
      return;
    }

    setLoading(true);
    try {
      // Look up group by invite code
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .select("*")
        .eq("invite_code", code.toUpperCase().trim())
        .maybeSingle();

      if (groupError || !group) {
        toast({ title: "Invalid code", description: "No group found with that invite code.", variant: "destructive" });
        return;
      }

      // Check if already a member (active)
      const { data: existing } = await supabase
        .from("group_members")
        .select("id, status")
        .eq("group_id", group.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing && existing.status === "active") {
        toast({ title: "Already a member!", description: "You're already in this group." });
        navigate(`/dashboard/${group.id}`);
        return;
      }

      // If placeholder param present, try to show confirmation
      if (placeholderId) {
        const { data: placeholder } = await supabase
          .from("group_members")
          .select("*")
          .eq("id", placeholderId)
          .eq("group_id", group.id)
          .eq("is_placeholder", true)
          .is("user_id", null)
          .maybeSingle();

        if (placeholder) {
          // Get expense count for this placeholder
          const { data: splits } = await supabase
            .from("expense_splits")
            .select("share_amount, expense_id")
            .eq("member_name", placeholder.name)
            .is("user_id", null);

          // Filter to this group's expenses
          const { data: groupExpenses } = await supabase
            .from("expenses")
            .select("id")
            .eq("group_id", group.id);

          const groupExpenseIds = new Set((groupExpenses ?? []).map((e) => e.id));
          const relevantSplits = (splits ?? []).filter((s) => groupExpenseIds.has(s.expense_id));

          const totalAmount = relevantSplits.reduce((sum, s) => sum + Number(s.share_amount), 0);

          setPlaceholderInfo({
            id: placeholder.id,
            name: placeholder.name,
            groupId: group.id,
            groupName: group.name,
            expenseCount: relevantSplits.length,
            totalAmount,
          });
          setGroupData({ id: group.id, name: group.name });
          setConfirmingMerge(true);
          return;
        }
        // Placeholder not found/already claimed — fall through to normal join
      }

      // If user was previously in group but left, rejoin
      if (existing && existing.status === "left") {
        await supabase
          .from("group_members")
          .update({ status: "active", left_at: null })
          .eq("id", existing.id);

        await fetchGroups();
        toast({ title: `Rejoined ${group.name}!`, description: "Welcome back 🎉" });
        navigate(`/dashboard/${group.id}`);
        return;
      }

      // Join the group as new member
      await joinAsNewMember(group.id, group.name);
    } catch (err) {
      toast({ title: "Failed to join", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const joinAsNewMember = async (groupId: string, groupName: string) => {
    if (!user) return;
    const { error: joinError } = await supabase
      .from("group_members")
      .insert({
        group_id: groupId,
        user_id: user.id,
        name: profile?.display_name ?? user.email?.split("@")[0] ?? "Member",
        is_placeholder: false,
      });

    if (joinError) throw joinError;

    await fetchGroups();
    toast({ title: `Joined ${groupName}!`, description: "Welcome to the group 🎉" });
    navigate(`/dashboard/${groupId}`);
  };

  const handleMerge = async () => {
    if (!user || !placeholderInfo) return;
    setLoading(true);
    try {
      // Step 1: Claim the placeholder group_members record
      const { data: updated, error: mergeError } = await supabase
        .from("group_members")
        .update({
          user_id: user.id,
          is_placeholder: false,
          name: profile?.display_name ?? user.email?.split("@")[0] ?? placeholderInfo.name,
        })
        .eq("id", placeholderInfo.id)
        .eq("is_placeholder", true)
        .is("user_id", null)
        .select("id");

      if (mergeError) throw mergeError;
      if (!updated || updated.length === 0) {
        throw new Error("Could not claim placeholder. It may have already been claimed.");
      }

      // Step 2: Scope expense_splits update to this group only
      const { data: groupExpenses } = await supabase
        .from("expenses")
        .select("id")
        .eq("group_id", placeholderInfo.groupId);

      const expenseIds = (groupExpenses ?? []).map((e) => e.id);

      if (expenseIds.length > 0) {
        await supabase
          .from("expense_splits")
          .update({ user_id: user.id })
          .is("user_id", null)
          .eq("member_name", placeholderInfo.name)
          .in("expense_id", expenseIds);
      }

      // Step 3: Claim expenses where placeholder was the payer
      await supabase
        .from("expenses")
        .update({ paid_by_user_id: user.id })
        .eq("group_id", placeholderInfo.groupId)
        .eq("paid_by_name", placeholderInfo.name)
        .is("paid_by_user_id", null);

      await fetchGroups();
      toast({
        title: `Joined ${placeholderInfo.groupName}!`,
        description: `Merged with ${placeholderInfo.name}'s expenses 🎉`,
      });
      navigate(`/dashboard/${placeholderInfo.groupId}`);
    } catch (err) {
      toast({
        title: "Merge failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineMerge = async () => {
    if (!groupData) return;
    setLoading(true);
    setConfirmingMerge(false);
    try {
      await joinAsNewMember(groupData.id, groupData.name);
    } catch (err) {
      toast({
        title: "Failed to join",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Merge confirmation screen
  if (confirmingMerge && placeholderInfo) {
    return (
      <div className="screen-container bg-background items-center justify-center">
        <div className="w-full px-6">
          <div className="text-center mb-8">
            <h1 className="bountt-wordmark text-4xl text-foreground mb-2">
              bountt<span className="text-primary">.</span>
            </h1>
            <div className="bg-secondary text-secondary-foreground rounded-full px-5 py-2 text-sm font-bold inline-block">
              Join {placeholderInfo.groupName} 🔓
            </div>
          </div>

          <div className="bg-card rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-foreground text-center">
              Are you {placeholderInfo.name}?
            </h2>

            <p className="text-sm text-muted-foreground text-center">
              <strong>{placeholderInfo.name}</strong> has{" "}
              {placeholderInfo.expenseCount > 0
                ? `${placeholderInfo.expenseCount} expense split${placeholderInfo.expenseCount !== 1 ? "s" : ""} totalling $${placeholderInfo.totalAmount.toFixed(2)}`
                : "no expenses yet"}{" "}
              in this group.
            </p>

            {namesMismatch && (
              <div className="flex items-start gap-2 bg-destructive/10 text-destructive rounded-xl px-4 py-3 text-xs">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  This placeholder is named <strong>{placeholderInfo.name}</strong>, but you're logged in as{" "}
                  <strong>{userName}</strong>. Only proceed if this is really you.
                </span>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                Joining as {placeholderInfo.name} will:
              </p>
              <ul className="text-sm text-foreground space-y-1">
                <li>✓ Transfer all of {placeholderInfo.name}'s expenses to your account</li>
                <li>✓ Preserve balance history</li>
                <li>✓ Replace the placeholder with your profile</li>
              </ul>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={handleMerge}
                disabled={loading}
                className="w-full bg-primary text-primary-foreground rounded-full py-4 font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                Yes, that's me →
              </button>
              <button
                onClick={handleDeclineMerge}
                disabled={loading}
                className="w-full bg-secondary text-secondary-foreground rounded-full py-3 font-semibold text-sm disabled:opacity-50"
              >
                No, join as new member
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: invite code entry form
  return (
    <div className="screen-container bg-background items-center justify-center">
      <div className="w-full px-6">
        <div className="text-center mb-8">
          <h1 className="bountt-wordmark text-4xl text-foreground mb-2">
            bountt<span className="text-primary">.</span>
          </h1>
          <div className="bg-secondary text-secondary-foreground rounded-full px-5 py-2 text-sm font-bold inline-block">
            Join a group 🔓
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-card rounded-2xl px-4 py-3.5 shadow-sm">
            <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
              Group Invite Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="BNTT-XXXX"
              maxLength={9}
              className="w-full text-base font-mono text-foreground bg-transparent outline-none placeholder:text-muted-foreground uppercase"
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length < 9}
            className="w-full bg-primary text-primary-foreground rounded-full py-4 font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            Join Group →
          </button>
        </form>
      </div>
    </div>
  );
}
