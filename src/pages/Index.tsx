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
    if (user && setupComplete && !editing) navigate("/draft");
  }, [user, setupComplete, navigate, editing]);
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  return <SetupWizard />;
};

export default Index;
