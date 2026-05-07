import { useEffect } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useDraftStore } from "@/lib/draft-store";
import { useAuth } from "@/hooks/useAuth";
import SetupWizard from "./SetupWizard";

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const editing = searchParams.has("step") || searchParams.get("edit") === "1";

  useEffect(() => {
    // / is the Draft Room home (with hamburger). Wizard only when explicitly editing.
    if (user && !editing) navigate("/draft-room", { replace: true });
  }, [user, editing, navigate]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  // Only shown when ?edit=1 or ?step=… is present
  return <SetupWizard />;
};

export default Index;
