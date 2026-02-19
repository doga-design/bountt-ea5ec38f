import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import ComingSoon from "./ComingSoon";

export default function Dashboard() {
  const { groupId } = useParams<{ groupId: string }>();
  const { setCurrentGroup, userGroups } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (groupId) {
      const group = userGroups.find((g) => g.id === groupId);
      if (group) setCurrentGroup(group);
    }
  }, [groupId, userGroups]);

  return <ComingSoon title="Dashboard — Phase 2" />;
}
