import { useEffect } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useDraftStore } from "@/lib/draft-store";
import { Button } from "@/components/ui/button";
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
  return (
    <>
      <div className="flex justify-end gap-2 p-3 border-b bg-background">
        <Button asChild variant="outline" size="sm">
          <Link to="/espn">Connect ESPN League</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link to="/draft">Open Draft</Link>
        </Button>
      </div>
      <SetupWizard />
    </>
  );
};

export default Index;
