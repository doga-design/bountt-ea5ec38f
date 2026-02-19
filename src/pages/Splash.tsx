import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import splashHand from "@/assets/bountt-splash-hand.png";

export default function Splash() {
  const navigate = useNavigate();
  const { user, authLoading, userGroups, groupsLoading } = useApp();

  useEffect(() => {
    // Wait for auth to resolve before deciding where to go
    if (authLoading) return;

    const timer = setTimeout(() => {
      if (user) {
        // If user has groups, go to their first group's dashboard
        if (!groupsLoading && userGroups.length > 0) {
          navigate(`/dashboard/${userGroups[0].id}`, { replace: true });
        } else if (!groupsLoading) {
          navigate("/onboarding/group-name", { replace: true });
        }
      } else {
        navigate("/auth", { replace: true });
      }
    }, 2200);
    return () => clearTimeout(timer);
  }, [navigate, user, authLoading, userGroups, groupsLoading]);

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
