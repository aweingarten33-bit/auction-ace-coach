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
import { AuthProvider, useAuth } from "@/hooks/useAuth";

const queryClient = new QueryClient();

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
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
