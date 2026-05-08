import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import SetupWizard from "./SetupWizard";

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loading } = useAuth();
  const editing = searchParams.has("step") || searchParams.get("edit") === "1";
  const [routing, setRouting] = useState(true);

  useEffect(() => {
    if (loading || editing) { setRouting(false); return; }
    navigate("/draft-room", { replace: true });
  }, [editing, loading, navigate]);

  if (loading || routing) return null;
  return <SetupWizard />;
};

export default Index;
