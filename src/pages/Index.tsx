import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDraftStore } from "@/lib/draft-store";
import SetupWizard from "./SetupWizard";

const Index = () => {
  const navigate = useNavigate();
  const setupComplete = useDraftStore((s) => s.setupComplete);
  useEffect(() => {
    if (setupComplete) navigate("/draft");
  }, [setupComplete, navigate]);
  return <SetupWizard />;
};

export default Index;
