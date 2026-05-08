import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Draft from "./pages/Draft.tsx";
import DraftRoom from "./pages/DraftRoom.tsx";
import SetupWizard from "./pages/SetupWizard.tsx";
import Planner from "./pages/Planner.tsx";
import NotFound from "./pages/NotFound.tsx";
import AuthPage from "./pages/Auth.tsx";
import EspnSettings from "./pages/EspnSettings.tsx";
import Admin from "./pages/Admin.tsx";
import CardPreview from "./pages/CardPreview.tsx";
import LogoPicker from "./pages/LogoPicker.tsx";
import ClaimTeam from "./pages/ClaimTeam.tsx";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LockProvider, useLock } from "@/hooks/useLock";


const queryClient = new QueryClient();

function Protected({
  children,
  allowWhenLocked = false,
  adminOnly = false,
}: {
  children: JSX.Element;
  allowWhenLocked?: boolean;
  adminOnly?: boolean;
}) {
  const { loading } = useAuth();
  const { locked, isAdmin, loading: lockLoading } = useLock();
  if (loading || lockLoading) return null;
  if (locked && !isAdmin && !allowWhenLocked) return <NotFound />;
  if (adminOnly && !isAdmin) return <NotFound />;
  return children;
}

function PublicGate({ children }: { children: JSX.Element }) {
  const { locked, isAdmin, loading } = useLock();
  const { loading: authLoading } = useAuth();
  if (loading || authLoading) return null;
  if (locked && !isAdmin) return <NotFound />;
  return children;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {/* Global SVG filter — spray-paint stencil edges via turbulence + displacement */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <filter id="banksy-rough">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="1.4" />
        </filter>
        <filter id="banksy-rough-strong">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="2.5" />
        </filter>
      </svg>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <LockProvider>
            
            <Routes>
              {/* Index = router that picks Draft Room or Setup based on setupComplete */}
              <Route path="/" element={<PublicGate><Index /></PublicGate>} />
              <Route path="/auth" element={<PublicGate><AuthPage /></PublicGate>} />

              {/* New home page when setup is complete */}
              <Route path="/draft-room" element={<Protected><DraftRoom /></Protected>} />

              {/* Setup wizard — accessible from drawer */}
              <Route path="/setup" element={<Protected><SetupWizard /></Protected>} />

              {/* Planner kept for now — can be deleted later */}
              <Route path="/planner" element={<Protected><Planner /></Protected>} />

              {/* ESPN connection settings */}
              <Route path="/espn" element={<Protected><EspnSettings /></Protected>} />

              {/* Admin always reachable so you can unlock */}
              <Route path="/admin" element={<Protected allowWhenLocked><Admin /></Protected>} />

              {/* Legacy redirects — old /draft, /draft-v2 etc all go to the new home */}
              <Route path="/draft" element={<Navigate to="/draft-room" replace />} />
              <Route path="/draft-v2" element={<Navigate to="/draft-room" replace />} />
              <Route path="/draft-os" element={<Navigate to="/draft-room" replace />} />
              <Route path="/dashboard" element={<Navigate to="/draft-room" replace />} />
              <Route path="/m" element={<Navigate to="/draft-room" replace />} />
              <Route path="/mobile" element={<Navigate to="/draft-room" replace />} />

              <Route path="/claim" element={<Navigate to="/draft-room" replace />} />
              <Route path="/card-preview" element={<CardPreview />} />
              <Route path="/logos" element={<LogoPicker />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </LockProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
