import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import SetupWizard from "./SetupWizard";

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const editing = searchParams.has("step") || searchParams.get("edit") === "1";
  const [routing, setRouting] = useState(true);

  useEffect(() => {
    if (loading || !user || editing) { setRouting(false); return; }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("espn_team_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data?.espn_team_id) navigate("/claim", { replace: true });
      else navigate("/draft-room", { replace: true });
    })();
  }, [user, editing, loading, navigate]);

  if (loading || routing) return null;
  if (!user) return <Navigate to="/auth" replace />;
  return <SetupWizard />;
};

export default Index;
