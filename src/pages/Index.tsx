import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDraftStore } from "@/lib/draft-store";
import { useIsMobile } from "@/hooks/use-mobile";
import SetupWizard from "./SetupWizard";

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setupComplete = useDraftStore((s) => s.setupComplete);
  const isMobile = useIsMobile();
  const editing = searchParams.has("step") || searchParams.get("edit") === "1";
  useEffect(() => {
    if (setupComplete && !editing) navigate(isMobile ? "/m" : "/draft");
  }, [setupComplete, navigate, editing, isMobile]);
  return <SetupWizard />;
};

export default Index;
