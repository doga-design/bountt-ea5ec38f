import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";

const GRADIENTS: Record<string, { from: string; to: string }> = {
  "solid-orange": { from: "hsl(18,89%,47%)", to: "hsl(18,89%,47%)" },
  "orange-red": { from: "hsl(15,90%,55%)", to: "hsl(0,85%,50%)" },
  "blue-purple": { from: "hsl(220,80%,55%)", to: "hsl(270,70%,55%)" },
  "green-teal": { from: "hsl(150,60%,45%)", to: "hsl(180,70%,45%)" },
  "pink-orange": { from: "hsl(330,80%,60%)", to: "hsl(25,90%,55%)" },
  "gray-black": { from: "hsl(0,0%,40%)", to: "hsl(0,0%,15%)" },
};

export default function Groups() {
  const navigate = useNavigate();
  const { userGroups, groupsLoading } = useApp();
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});

  // Redirect to empty state if no groups
  useEffect(() => {
    if (!groupsLoading && userGroups.length === 0) {
      navigate("/groups/empty", { replace: true });
    }
  }, [groupsLoading, userGroups, navigate]);

  // Fetch member counts for all groups in one query
  useEffect(() => {
    if (userGroups.length === 0) return;
    const groupIds = userGroups.map((g) => g.id);

    supabase
      .from("group_members")
      .select("group_id")
      .in("group_id", groupIds)
      .eq("status", "active")
      .then(({ data }) => {
        if (!data) return;
        const counts: Record<string, number> = {};
        for (const row of data) {
          counts[row.group_id] = (counts[row.group_id] || 0) + 1;
        }
        setMemberCounts(counts);
      });
  }, [userGroups]);

  if (groupsLoading) {
    return (
      <div className="screen-container items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="screen-container bg-background">
      <div className="flex-1 px-5 pt-8 pb-24">
        <h1 className="text-2xl font-bold text-foreground mb-6">Your Groups</h1>

        {/* Group cards */}
        <div className="space-y-3">
          {userGroups.map((group) => {
            const g = GRADIENTS[group.banner_gradient] ?? GRADIENTS["orange-red"];
            const count = memberCounts[group.id] ?? 0;
            return (
              <button
                key={group.id}
                onClick={() => navigate(`/dashboard/${group.id}`)}
                className="w-full text-left"
                style={{
                  background: `linear-gradient(135deg, ${g.from}, ${g.to})`,
                  border: "4px solid white",
                  borderRadius: "20px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  minHeight: "80px",
                  padding: "18px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div className="text-lg font-bold text-white">
                    {group.emoji} {group.name}
                  </div>
                  <div className="text-sm text-white/70 mt-0.5">
                    {count} {count === 1 ? "member" : "members"}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white flex-shrink-0" />
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <hr className="border-border my-5" />

        {/* Create + Join buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate("/onboarding/group-name")}
            className="w-full bg-card text-foreground font-semibold text-base py-4"
            style={{
              border: "1.5px dashed hsl(var(--border))",
              borderRadius: "20px",
            }}
          >
            + Create a group
          </button>
          <button
            onClick={() => navigate("/join")}
            className="w-full bg-card text-foreground font-semibold text-base py-4"
            style={{
              border: "1.5px dashed hsl(var(--border))",
              borderRadius: "20px",
            }}
          >
            Join a group
          </button>
        </div>
      </div>
      <BottomNav onFabPress={() => {
        const lastGroupId = localStorage.getItem("bountt_last_group_id") || userGroups[0]?.id;
        if (lastGroupId) navigate(`/dashboard/${lastGroupId}`);
      }} />
    </div>
  );
}
