import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import AuthGuard from "@/components/AuthGuard";

// Pages
import Splash from "./pages/Splash";
import Auth from "./pages/Auth";

import GroupName from "./pages/onboarding/GroupName";
import Invite from "./pages/onboarding/Invite";
import Join from "./pages/Join";
import Dashboard from "./pages/Dashboard";
import ComingSoon from "./pages/ComingSoon";
import Groups from "./pages/Groups";
import GroupSettings from "./pages/GroupSettings";
import ActivityLog from "./pages/ActivityLog";
import NotFound from "./pages/NotFound";
import EmptyGroups from "./pages/EmptyGroups";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Splash />} />
              <Route path="/auth" element={<Auth />} />
              

              {/* Empty Groups */}
              <Route path="/groups/empty" element={<AuthGuard><EmptyGroups /></AuthGuard>} />

              {/* Protected — Onboarding */}
              <Route path="/onboarding/group-name" element={<AuthGuard><GroupName /></AuthGuard>} />
              <Route path="/onboarding/invite" element={<AuthGuard><Invite /></AuthGuard>} />

              {/* Protected — Join */}
              <Route path="/join" element={<AuthGuard><Join /></AuthGuard>} />
              <Route path="/join/:inviteCode" element={<AuthGuard><Join /></AuthGuard>} />

              {/* Protected — Dashboard */}
              <Route path="/dashboard/:groupId" element={<AuthGuard><Dashboard /></AuthGuard>} />

              {/* Protected — Phase 2 stubs */}
              <Route path="/groups" element={<AuthGuard><Groups /></AuthGuard>} />
              <Route path="/groups/:groupId/members" element={<AuthGuard><ComingSoon title="Members — Phase 2" /></AuthGuard>} />
              <Route path="/groups/:groupId/settings" element={<AuthGuard><GroupSettings /></AuthGuard>} />
              <Route path="/groups/:groupId/activity" element={<AuthGuard><ActivityLog /></AuthGuard>} />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AppProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
