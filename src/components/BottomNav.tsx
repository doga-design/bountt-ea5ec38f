import { Home, Layers, Plus } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

interface BottomNavProps {
  onFabPress: () => void;
}

export default function BottomNav({ onFabPress }: BottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname.startsWith("/dashboard");
  const isGroups = location.pathname === "/groups";

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-6 pb-6 pt-3">
      <div className="flex items-center justify-between">
        {/* Home */}
        <button onClick={() => {}} className="flex flex-col items-center gap-1" aria-label="Home">
          <Home className={`w-5 h-5 ${isHome ? "text-primary" : "text-muted-foreground"}`} />
          <span className={`text-[10px] font-medium ${isHome ? "text-primary" : "text-muted-foreground"}`}>Home</span>
        </button>

        {/* FAB */}
        <button
          onClick={onFabPress}
          className="w-14 h-14 -mt-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          aria-label="Add expense"
        >
          <Plus className="w-7 h-7" />
        </button>

        {/* All Groups */}
        <button
          onClick={() => navigate("/groups")}
          className="flex flex-col items-center gap-1"
          aria-label="All Groups"
        >
          <Layers className={`w-5 h-5 ${isGroups ? "text-primary" : "text-muted-foreground"}`} />
          <span className={`text-[10px] font-medium ${isGroups ? "text-primary" : "text-muted-foreground"}`}>
            All Groups
          </span>
        </button>
      </div>
    </div>
  );
}
