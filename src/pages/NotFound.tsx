import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.warn("404: route not found →", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center max-w-sm">
        <p className="text-6xl font-black text-primary">404</p>
        <h1 className="mt-2 text-xl font-bold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{location.pathname}</code> doesn't exist.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button asChild>
            <Link to="/"><Home className="w-4 h-4" /> Return to Dashboard</Link>
          </Button>
          <Button asChild variant="ghost" onClick={() => window.history.back()}>
            <button type="button"><ArrowLeft className="w-4 h-4" /> Go back</button>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
