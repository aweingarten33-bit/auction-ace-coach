import { useState, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Landing from "./pages/LandingEditorial.tsx";
import LandingFullBleed from "./pages/LandingFullBleed.tsx";
import DraftRoom from "./pages/DraftRoom.tsx";
import SetupWizard from "./pages/SetupWizard.tsx";
import NotFound from "./pages/NotFound.tsx";
import EspnSettings from "./pages/EspnSettings.tsx";
import Admin from "./pages/Admin.tsx";
import TeamPicker from "./pages/TeamPicker.tsx";
import Passcode from "./pages/Passcode.tsx";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LockProvider, useLock } from "@/hooks/useLock";
import Preloader from "@/components/Preloader";


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

function AppShell() {
  const [ready, setReady] = useState(false);
  const handlePreloaderDone = useCallback(() => {
    setReady(true);
    requestAnimationFrame(() => {
      (window as typeof window & { __landingVisible?: boolean }).__landingVisible = true;
      window.dispatchEvent(new Event("landing:visible"));
    });
  }, []);

  return (
    <>
      {!ready && <Preloader onDone={handlePreloaderDone} />}
      <div style={{ visibility: ready ? "visible" : "hidden" }}>
        <AppRoutes />
      </div>
    </>
  );
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LockProvider>
          <Routes>
            <Route path="/" element={<PublicGate><Landing /></PublicGate>} />
            <Route path="/index" element={<PublicGate><Landing /></PublicGate>} />
            <Route path="/landing" element={<PublicGate><Landing /></PublicGate>} />
            <Route path="/full-bleed" element={<PublicGate><LandingFullBleed /></PublicGate>} />
            <Route path="/team" element={<TeamPicker />} />
            <Route path="/auth" element={<Navigate to="/espn" replace />} />
            <Route path="/draft-room" element={<PublicGate><DraftRoom /></PublicGate>} />
            <Route path="/setup" element={<Protected><SetupWizard /></Protected>} />
            <Route path="/espn" element={<Protected><EspnSettings /></Protected>} />
            <Route path="/admin" element={<Protected allowWhenLocked><Admin /></Protected>} />
            <Route path="/passcode" element={<Passcode />} />

            {/* Legacy redirects */}
            <Route path="/draft" element={<Navigate to="/draft-room" replace />} />
            <Route path="/dashboard" element={<Navigate to="/draft-room" replace />} />
            <Route path="/claim" element={<Navigate to="/draft-room" replace />} />
            <Route path="/claim-team" element={<Navigate to="/team" replace />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </LockProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppShell />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
