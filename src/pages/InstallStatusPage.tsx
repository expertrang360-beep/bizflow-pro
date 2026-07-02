import { useNavigate } from "react-router-dom";
import { ArrowLeft, Smartphone, CheckCircle2, Download, Share, Chrome, Info } from "lucide-react";
import InstallStatusCard from "@/components/InstallStatusCard";
import { useInstallStatus } from "@/hooks/useInstallStatus";
import { Button } from "@/components/ui/button";

export default function InstallStatusPage() {
  const navigate = useNavigate();
  const { status, isIOS } = useInstallStatus();

  return (
    <div className="flex flex-col min-h-full">
      <div className="gradient-hero px-5 pt-12 pb-8">
        <button
          onClick={() => navigate(-1)}
          className="text-primary-foreground/80 mb-3 flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-primary-foreground/20 rounded-2xl flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-primary-foreground text-xl font-bold">Install Status</h1>
            <p className="text-primary-foreground/70 text-xs">
              Check whether BizFlow is installed on this device
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4 animate-fade-in">
        <InstallStatusCard />

        <div className="bg-card rounded-2xl border border-border shadow-card p-4">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" /> How installation works
          </h2>
          <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <li className="flex gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--success))] flex-shrink-0 mt-0.5" />
              <span><b className="text-foreground">Installed</b> — App launches from the home screen without a browser bar.</span>
            </li>
            <li className="flex gap-2">
              <Download className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
              <span><b className="text-foreground">Available</b> — Chrome / Edge has offered an install prompt you can trigger.</span>
            </li>
            <li className="flex gap-2">
              <Share className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
              <span><b className="text-foreground">iOS manual</b> — Safari doesn't auto-prompt; use Share → Add to Home Screen.</span>
            </li>
            <li className="flex gap-2">
              <Chrome className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <span><b className="text-foreground">Not supported</b> — Browser (Firefox mobile, in-app WebViews) can't install PWAs.</span>
            </li>
          </ul>
        </div>

        {isIOS && status !== "installed" && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
            <p className="text-sm font-semibold mb-2">iPhone / iPad steps</p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Open this page in Safari (not Chrome or in-app browsers)</li>
              <li>Tap the Share icon at the bottom</li>
              <li>Scroll and tap "Add to Home Screen"</li>
              <li>Tap "Add" to confirm</li>
            </ol>
          </div>
        )}

        {status === "installed" && (
          <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
            Continue to Dashboard
          </Button>
        )}
      </div>
    </div>
  );
}
