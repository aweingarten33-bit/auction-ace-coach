import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDraftStore } from "@/lib/draft-store";
import SetupWizard from "./SetupWizard";

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setupComplete = useDraftStore((s) => s.setupComplete);
  const editing = searchParams.has("step") || searchParams.get("edit") === "1";
  useEffect(() => {
    if (setupComplete && !editing) navigate("/draft");
  }, [setupComplete, navigate, editing]);
  return <SetupWizard />;
};

export default Index;
