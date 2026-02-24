import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/contexts/AppContext";
import { Loader2 } from "lucide-react";
import PlaceholderSelectDialog from "@/components/join/PlaceholderSelectDialog";
import { formatCurrency } from "@/lib/bountt-utils";

interface PlaceholderWithExpenses {
  id: string;
  name: string;
  totalExpenses: number;
}

export default function Join() {
  const { inviteCode: paramCode } = useParams<{ inviteCode?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, fetchGroups, profile } = useApp();

  const [code, setCode] = useState(paramCode ?? "");
  const [loading, setLoading] = useState(false);
  const [mergeLoading, setMergeLoading] = useState(false);

  // Placeholder dialog state
  const [showPlaceholderDialog, setShowPlaceholderDialog] = useState(false);
  const [placeholders, setPlaceholders] = useState<PlaceholderWithExpenses[]>([]);
  const [pendingGroup, setPendingGroup] = useState<{ id: string; name: string } | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate("/auth", { state: { from: `${window.location.pathname}` } });
      return;
    }

    setLoading(true);
    try {
      // Look up group by invite code using secure RPC
      const { data: groups, error: groupError } = await supabase
        .rpc("lookup_group_by_invite", { p_invite_code: code.toUpperCase().trim() });

      const group = groups?.[0] ?? null;

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

      // If user was previously in group but left, rejoin
      if (existing && existing.status === "left") {
        // Bug 5 fix: Check for color collision on rejoin
        const { data: activeColorRows } = await supabase
          .from("group_members")
          .select("avatar_color")
          .eq("group_id", group.id)
          .eq("status", "active");
        const activeColors = activeColorRows?.filter((m) => m.avatar_color).map((m) => m.avatar_color!) ?? [];

        // Get the member's current color
        const { data: memberRow } = await supabase
          .from("group_members")
          .select("avatar_color")
          .eq("id", existing.id)
          .single();

        let updateFields: Record<string, unknown> = { status: "active", left_at: null };
        if (memberRow?.avatar_color && activeColors.includes(memberRow.avatar_color)) {
          const { pickAvailableColor } = await import("@/lib/avatar-utils");
          updateFields.avatar_color = pickAvailableColor(activeColors);
        } else if (!memberRow?.avatar_color) {
          const { pickAvailableColor } = await import("@/lib/avatar-utils");
          updateFields.avatar_color = pickAvailableColor(activeColors);
        }

        await supabase
          .from("group_members")
          .update(updateFields)
          .eq("id", existing.id);

        await fetchGroups();
        toast({ title: `Rejoined ${group.name}!`, description: "Welcome back 🎉" });
        navigate(`/dashboard/${group.id}`);
        return;
      }

      // Fetch placeholders for this group
      const { data: placeholderMembers } = await supabase
        .from("group_members")
        .select("id, name")
        .eq("group_id", group.id)
        .eq("is_placeholder", true)
        .is("user_id", null);

      if (placeholderMembers && placeholderMembers.length > 0) {
        // Compute expense totals for each placeholder
        const withExpenses: PlaceholderWithExpenses[] = await Promise.all(
          placeholderMembers.map(async (ph) => {
            const { data: splits } = await supabase
              .from("expense_splits")
              .select("share_amount, expense_id")
              .eq("member_name", ph.name)
              .is("user_id", null);

            // Filter splits to only this group's expenses
            let total = 0;
            if (splits && splits.length > 0) {
              const expenseIds = [...new Set(splits.map((s) => s.expense_id))];
              const { data: expenses } = await supabase
                .from("expenses")
                .select("id")
                .eq("group_id", group.id)
                .in("id", expenseIds);

              const validIds = new Set(expenses?.map((e) => e.id) ?? []);
              total = splits
                .filter((s) => validIds.has(s.expense_id))
                .reduce((sum, s) => sum + Number(s.share_amount), 0);
            }

            return { id: ph.id, name: ph.name, totalExpenses: total };
          })
        );

        setPendingGroup({ id: group.id, name: group.name });
        setPlaceholders(withExpenses);
        setShowPlaceholderDialog(true);
        return;
      }

      // No placeholders — join as new member directly
      await joinAsNewMember(group.id, group.name);
    } catch (err) {
      toast({ title: "Failed to join", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const joinAsNewMember = async (groupId: string, groupName: string) => {
    // Bug 4 fix: Assign avatar_color on join
    const { data: existingMembers } = await supabase
      .from("group_members")
      .select("avatar_color")
      .eq("group_id", groupId)
      .eq("status", "active");
    const existingColors = existingMembers?.filter((m) => m.avatar_color).map((m) => m.avatar_color!) ?? [];

    // Import pickAvailableColor
    const { pickAvailableColor } = await import("@/lib/avatar-utils");
    const newColor = pickAvailableColor(existingColors);

    const { error: joinError } = await supabase
      .from("group_members")
      .insert({
        group_id: groupId,
        user_id: user!.id,
        name: profile?.display_name ?? user!.email?.split("@")[0] ?? "Member",
        is_placeholder: false,
        avatar_color: newColor,
      });

    if (joinError) throw joinError;

    await fetchGroups();
    toast({ title: `Joined ${groupName}!`, description: "Welcome to the group 🎉" });
    navigate(`/dashboard/${groupId}`);
  };

  const handlePlaceholderSelection = async (placeholderId: string | null) => {
    if (!pendingGroup) return;
    setMergeLoading(true);

    try {
      if (placeholderId) {
        // Merge with placeholder using RPC
        const { error } = await supabase.rpc("claim_placeholder", {
          p_placeholder_id: placeholderId,
        });

        if (error) throw error;

        const selected = placeholders.find((p) => p.id === placeholderId);
        await fetchGroups();
        toast({
          title: `Joined ${pendingGroup.name}!`,
          description: `Merged with ${selected?.name}'s expenses 🎉`,
        });
        navigate(`/dashboard/${pendingGroup.id}`);
      } else {
        // Join as new member
        await joinAsNewMember(pendingGroup.id, pendingGroup.name);
      }
    } catch (err) {
      toast({
        title: "Failed to join",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setMergeLoading(false);
      setShowPlaceholderDialog(false);
    }
  };

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

        <form onSubmit={handleJoin} className="space-y-4">
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

      <PlaceholderSelectDialog
        open={showPlaceholderDialog}
        onOpenChange={setShowPlaceholderDialog}
        placeholders={placeholders}
        onSelect={handlePlaceholderSelection}
        loading={mergeLoading}
      />
    </div>
  );
}
