import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useDraftStore } from "@/lib/draft-store";
import { Button } from "@/components/ui/button";
import SetupWizard from "./SetupWizard";

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setupComplete = useDraftStore((s) => s.setupComplete);
  const editing = searchParams.has("step") || searchParams.get("edit") === "1";
  useEffect(() => {
    if (setupComplete && !editing) navigate("/draft");
  }, [setupComplete, navigate, editing]);
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
