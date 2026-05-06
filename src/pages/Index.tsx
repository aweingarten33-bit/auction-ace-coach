import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import SetupWizard from "./SetupWizard";

const Index = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  return <SetupWizard />;
};

export default Index;
