import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function GlobalSignOutButton() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      onClick={async () => {
        await signOut();
        navigate("/auth");
      }}
      className="fixed right-3 top-3 z-[100] h-8 gap-1.5 rounded-full border border-border/60 bg-card/80 px-3 shadow-md backdrop-blur"
      aria-label="Sign out"
    >
      <LogOut className="h-3.5 w-3.5" />
      <span className="text-xs">Sign out</span>
    </Button>
  );
}
