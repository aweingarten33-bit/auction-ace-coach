import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "./pages/LandingEditorial.tsx";
import TeamPicker from "./pages/TeamPicker.tsx";
import EspnSetup from "./pages/EspnSetup.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter basename={base || "/"}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/team" element={<TeamPicker />} />
          <Route path="/espn" element={<EspnSetup />} />
          <Route path="/claim-team" element={<Navigate to="/team" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
