import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/contexts/AppContext";
import { Loader2 } from "lucide-react";

export default function Join() {
  const { inviteCode: paramCode } = useParams<{ inviteCode?: string }>();
  const [searchParams] = useSearchParams();
  const placeholderId = searchParams.get("placeholder");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, fetchGroups, profile } = useApp();

  const [code, setCode] = useState(paramCode ?? "");
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
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

      // If there's a placeholder to merge with
      if (placeholderId) {
        const { data: placeholder } = await supabase
          .from("group_members")
          .select("*")
          .eq("id", placeholderId)
          .eq("group_id", group.id)
          .eq("is_placeholder", true)
          .maybeSingle();

        if (placeholder) {
          // Merge: update placeholder to become this user
          const { error: mergeError } = await supabase
            .from("group_members")
            .update({
              user_id: user.id,
              is_placeholder: false,
              name: profile?.display_name ?? user.email?.split("@")[0] ?? placeholder.name,
            })
            .eq("id", placeholderId);

          if (mergeError) throw mergeError;

          // Also update expense_splits user_id for this member
          await supabase
            .from("expense_splits")
            .update({ user_id: user.id })
            .eq("member_name", placeholder.name)
            .is("user_id", null);

          await fetchGroups();
          toast({ title: `Joined ${group.name}!`, description: `Merged with ${placeholder.name}'s expenses 🎉` });
          navigate(`/dashboard/${group.id}`);
          return;
        }
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
      const { error: joinError } = await supabase
        .from("group_members")
        .insert({
          group_id: group.id,
          user_id: user.id,
          name: profile?.display_name ?? user.email?.split("@")[0] ?? "Member",
          is_placeholder: false,
        });

      if (joinError) throw joinError;

      await fetchGroups();
      toast({ title: `Joined ${group.name}!`, description: "Welcome to the group 🎉" });
      navigate(`/dashboard/${group.id}`);
    } catch (err) {
      toast({ title: "Failed to join", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
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
    </div>
  );
}
