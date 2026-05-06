import { useEffect } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useDraftStore } from "@/lib/draft-store";
import { useAuth } from "@/hooks/useAuth";
import SetupWizard from "./SetupWizard";

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const setupComplete = useDraftStore((s) => s.setupComplete);
  const editing = searchParams.has("step") || searchParams.get("edit") === "1";
  useEffect(() => {
    // Only auto-redirect from the bare landing entry, not when intentionally on /setup.
    if (user && setupComplete && !editing && location.pathname !== "/setup") navigate("/");
  }, [user, setupComplete, navigate, editing]);
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  return <SetupWizard />;
};

export default Index;
