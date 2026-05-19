import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground px-6">
      <button
        onClick={() => navigate("/")}
        className="absolute top-5 left-5 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Home
      </button>
      <div className="text-center">
        <h1 className="mb-3 text-6xl font-black tracking-tight">404</h1>
        <p className="text-muted-foreground mb-6">Page not found</p>
        <button
          onClick={() => navigate("/")}
          className="rounded-full bg-foreground text-background px-6 py-2.5 text-[14px] font-semibold hover:opacity-80 transition-opacity"
        >
          Back to home
        </button>
      </div>
    </div>
  );
};

export default NotFound;
