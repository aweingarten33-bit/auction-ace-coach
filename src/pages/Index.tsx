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
    // Setup-complete users land on the new Draft Room home page.
    // Old route /draft is redirected there in App.tsx.
    if (user && setupComplete && !editing) navigate("/draft-room");
  }, [user, setupComplete, navigate, editing]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  // First-time / editing users see the setup wizard at /
  return <SetupWizard />;
};

export default Index;
