import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { ArrowLeft } from "lucide-react";
import GroupBanner from "@/components/group-settings/GroupBanner";
import MembersList from "@/components/group-settings/MembersList";
import SettingsCards from "@/components/group-settings/SettingsCards";
import DangerZone from "@/components/group-settings/DangerZone";

export default function GroupSettings() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { userGroups, setCurrentGroup, currentGroup, groupMembers, user, fetchMembers } = useApp();

  useEffect(() => {
    if (groupId) {
      const group = userGroups.find((g) => g.id === groupId);
      if (group) setCurrentGroup(group);
    }
  }, [groupId, userGroups]);

  useEffect(() => {
    if (groupId) fetchMembers(groupId);
  }, [groupId]);

  if (!currentGroup || !groupId) return null;

  const isAdmin = currentGroup.created_by === user?.id;

  return (
    <div className="screen-container bg-background">
      {/* Back button */}
      <button
        onClick={() => navigate(`/dashboard/${groupId}`)}
        className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center"
      >
        <ArrowLeft className="w-5 h-5 text-foreground" />
      </button>

      <GroupBanner group={currentGroup} />

      <div className="px-4 py-6 space-y-6 pb-24">
        <MembersList
          members={groupMembers}
          currentUserId={user?.id ?? ""}
          isAdmin={isAdmin}
          groupId={groupId}
        />

        <SettingsCards group={currentGroup} />

        <DangerZone
          group={currentGroup}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
