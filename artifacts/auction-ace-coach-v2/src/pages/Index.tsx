import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelectedTeam } from "@/hooks/useSelectedTeam";

const Index = () => {
  const navigate = useNavigate();
  const { team } = useSelectedTeam();

  useEffect(() => {
    navigate(team ? "/draft-room" : "/team", { replace: true });
  }, [team, navigate]);

  return null;
};

export default Index;
