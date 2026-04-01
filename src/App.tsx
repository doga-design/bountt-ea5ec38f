import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import AuthGuard from "@/components/AuthGuard";
import DesktopShell from "@/components/layout/DesktopShell";

// Pages
import Splash from "./pages/Splash";
import Auth from "./pages/Auth";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";

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
import Profile from "./pages/Profile";

const queryClient = new QueryClient();

const ProtectedDesktop = ({ children }: { children: ReactNode }) => (
  <AuthGuard>
    <DesktopShell>{children}</DesktopShell>
  </AuthGuard>
);

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
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              

              {/* Empty Groups */}
              <Route path="/groups/empty" element={<AuthGuard><EmptyGroups /></AuthGuard>} />
              <Route path="/profile" element={<ProtectedDesktop><Profile /></ProtectedDesktop>} />

              {/* Protected — Onboarding */}
              <Route path="/onboarding/group-name" element={<AuthGuard><GroupName /></AuthGuard>} />
              <Route path="/onboarding/invite" element={<AuthGuard><Invite /></AuthGuard>} />

              {/* Protected — Join */}
              <Route path="/join" element={<AuthGuard><Join /></AuthGuard>} />
              <Route path="/join/:inviteCode" element={<AuthGuard><Join /></AuthGuard>} />

              {/* Protected — Dashboard */}
              <Route path="/dashboard/:groupId" element={<ProtectedDesktop><Dashboard /></ProtectedDesktop>} />

              {/* Protected — Phase 2 stubs */}
              <Route path="/groups" element={<ProtectedDesktop><Groups /></ProtectedDesktop>} />
              <Route path="/groups/:groupId/members" element={<AuthGuard><ComingSoon title="Members — Phase 2" /></AuthGuard>} />
              <Route path="/groups/:groupId/settings" element={<ProtectedDesktop><GroupSettings /></ProtectedDesktop>} />
              <Route path="/groups/:groupId/activity" element={<ProtectedDesktop><ActivityLog /></ProtectedDesktop>} />

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
