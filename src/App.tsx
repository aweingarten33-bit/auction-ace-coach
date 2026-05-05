import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Draft from "./pages/Draft.tsx";
import Planner from "./pages/Planner.tsx";
import NotFound from "./pages/NotFound.tsx";
import AuthPage from "./pages/Auth.tsx";
import EspnSettings from "./pages/EspnSettings.tsx";
import Admin from "./pages/Admin.tsx";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LockProvider, useLock } from "@/hooks/useLock";

const queryClient = new QueryClient();

function Protected({ children, allowWhenLocked = false }: { children: JSX.Element; allowWhenLocked?: boolean }) {
  const { user, loading } = useAuth();
  const { locked, isAdmin, loading: lockLoading } = useLock();
  if (loading || lockLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  // Site-wide lock — show fake 404 to non-admins (admins always get through)
  if (locked && !isAdmin && !allowWhenLocked) return <NotFound />;
  return children;
}

function PublicGate({ children }: { children: JSX.Element }) {
  const { locked, isAdmin, loading } = useLock();
  const { user, loading: authLoading } = useAuth();
  if (loading || authLoading) return null;
  // Hide auth/landing behind fake 404 too when locked, unless admin
  if (locked && !(user && isAdmin)) return <NotFound />;
  return children;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/draft" element={<Protected><Draft /></Protected>} />
            <Route path="/planner" element={<Protected><Planner /></Protected>} />
            <Route path="/espn" element={<Protected><EspnSettings /></Protected>} />
            <Route path="/admin" element={<Protected><Admin /></Protected>} />
            {/* Legacy redirects */}
            <Route path="/dashboard" element={<Navigate to="/draft" replace />} />
            <Route path="/m" element={<Navigate to="/draft" replace />} />
            <Route path="/mobile" element={<Navigate to="/draft" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
