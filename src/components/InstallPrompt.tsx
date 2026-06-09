import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstallStatus } from "@/hooks/useInstallStatus";

const DISMISS_KEY = "bizflow_install_dismissed_at";
const DISMISS_DAYS = 7;

function recentlyDismissed() {
  const ts = localStorage.getItem(DISMISS_KEY);
  if (!ts) return false;
  return Date.now() - Number(ts) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export default function InstallPrompt() {
  const { status, promptInstall } = useInstallStatus();
  const [dismissed, setDismissed] = useState(recentlyDismissed);
  const [showIOSDelay, setShowIOSDelay] = useState(false);

  useEffect(() => {
    if (status === "ios-manual") {
      const t = setTimeout(() => setShowIOSDelay(true), 2500);
      return () => clearTimeout(t);
    }
  }, [status]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  if (dismissed) return null;
  if (status === "installed" || status === "unsupported") return null;
  if (status === "ios-manual" && !showIOSDelay) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md animate-fade-in">
      <div className="bg-card border border-border shadow-lg rounded-2xl p-4 flex items-start gap-3">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
          <Download className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Install BizFlow</p>
          {status === "available" ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              Add to your home screen for a faster, app-like experience.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
              Tap <Share className="w-3 h-3 inline" /> then "Add to Home Screen".
            </p>
          )}
          {status === "available" && (
            <Button size="sm" onClick={promptInstall} className="mt-2 h-8">
              Install
            </Button>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
