import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import splashHand from "@/assets/bountt-splash-hand.png";

export default function Splash() {
  const navigate = useNavigate();
  const { user, authLoading, userGroups, groupsLoading } = useApp();
  const [minTimePassed, setMinTimePassed] = useState(false);

  // Phase 1: minimum splash animation time
  useEffect(() => {
    const timer = setTimeout(() => setMinTimePassed(true), 2200);
    return () => clearTimeout(timer);
  }, []);

  // Phase 2: navigate once data is ready AND min time has passed
  useEffect(() => {
    if (!minTimePassed || authLoading) return;
    if (user) {
      if (groupsLoading) return; // wait for groups to resolve
      if (userGroups.length > 0) {
        const lastGroupId = localStorage.getItem("bountt_last_group_id");
        const targetGroup = lastGroupId && userGroups.find((g) => g.id === lastGroupId)
          ? lastGroupId
          : userGroups[0].id;
        navigate(`/dashboard/${targetGroup}`, { replace: true });
      } else {
        navigate("/groups/empty", { replace: true });
      }
    } else {
      navigate("/auth", { replace: true });
    }
  }, [minTimePassed, authLoading, user, groupsLoading, userGroups, navigate]);

  return (
    <div className="screen-container bg-background overflow-hidden">
      <div className="flex flex-col items-center justify-center flex-1 px-8 pt-24">
        <h1 className="bountt-wordmark text-5xl text-foreground mb-3">
          bountt<span className="text-primary">.</span>
        </h1>
        <p className="text-muted-foreground text-base font-medium tracking-wide">
          Shared expenses made simple.
        </p>
      </div>

      <div className="flex justify-center pb-0 mt-auto">
        <img
          src={splashHand}
          alt="Bountt illustration"
          className="w-full max-w-[430px] object-cover object-top"
          style={{ maxHeight: "55vh" }}
        />
      </div>
    </div>
  );
}
