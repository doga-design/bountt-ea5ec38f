import { Home, Layers } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { getBackgroundSrc } from "@/lib/background-utils";

interface BottomNavProps {
  onFabPress: () => void;
}

export default function BottomNav({ onFabPress }: BottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentGroup } = useApp();
  const isHome = location.pathname.startsWith("/dashboard");
  const isGroups = location.pathname === "/groups";

  const fabBgSrc = getBackgroundSrc(currentGroup?.banner_gradient ?? "");

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border px-12 pb-5 pt-4">
      <div className="flex items-center justify-between">
        {/* Home */}
        <button onClick={() => {
          const lastGroupId = localStorage.getItem("bountt_last_group_id");
          if (lastGroupId) navigate(`/dashboard/${lastGroupId}`);
          else navigate("/groups");
        }} className="flex flex-col items-center gap-1" aria-label="Home">
          <Home className={`w-5 h-5 ${isHome ? "text-primary" : "text-muted-foreground"}`} />
          <span className={`text-[10px] font-semibold ${isHome ? "text-primary" : "text-muted-foreground"}`}>Home</span>
        </button>

        {/* FAB */}
        <button
          onClick={onFabPress}
          className="relative bottom-4 w-16 h-16 -mt-8 border-4 border-white rounded-full text-white flex items-center justify-center shadow-[0_8px_10px_rgba(0,0,0,0.15)] active:scale-90 transition-transform overflow-hidden"
          style={{
            backgroundImage: `url(${fabBgSrc})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-label="Add expense"
        >
          <div className="relative h-10 w-10" aria-hidden="true">
            <span className="absolute left-1/2 top-0 h-full w-[5px] -translate-x-1/2 rounded-full bg-primary-foreground" />
            <span className="absolute left-0 top-1/2 h-[5px] w-full -translate-y-1/2 rounded-full bg-primary-foreground" />
          </div>
        </button>

        {/* All Groups */}
        <button
          onClick={() => navigate("/groups")}
          className="flex flex-col items-center gap-1"
          aria-label="All Groups"
        >
          <Layers className={`w-5 h-5 ${isGroups ? "text-primary" : "text-muted-foreground"}`} />
          <span className={`text-[10px] font-semibold ${isGroups ? "text-primary" : "text-muted-foreground"}`}>
            All Groups
          </span>
        </button>
      </div>
    </div>
  );
}
