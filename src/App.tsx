import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";

// Pages
import Splash from "./pages/Splash";
import Auth from "./pages/Auth";
import GroupName from "./pages/onboarding/GroupName";
import Invite from "./pages/onboarding/Invite";
import Join from "./pages/Join";
import Dashboard from "./pages/Dashboard";
import ComingSoon from "./pages/ComingSoon";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Splash */}
            <Route path="/" element={<Splash />} />

            {/* Auth */}
            <Route path="/auth" element={<Auth />} />

            {/* Onboarding */}
            <Route path="/onboarding/group-name" element={<GroupName />} />
            <Route path="/onboarding/invite" element={<Invite />} />

            {/* Join via invite code */}
            <Route path="/join" element={<Join />} />
            <Route path="/join/:inviteCode" element={<Join />} />

            {/* Phase 2 — Dashboard */}
            <Route path="/dashboard/:groupId" element={<Dashboard />} />

            {/* Phase 2 — Groups */}
            <Route path="/groups" element={<ComingSoon title="All Groups — Phase 2" />} />
            <Route path="/groups/:groupId/members" element={<ComingSoon title="Members — Phase 2" />} />
            <Route path="/groups/:groupId/settings" element={<ComingSoon title="Settings — Phase 2" />} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
