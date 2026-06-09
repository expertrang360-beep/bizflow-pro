import { CheckCircle2, Download, Smartphone, Share, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstallStatus } from "@/hooks/useInstallStatus";

export default function InstallStatusCard() {
  const { status, promptInstall } = useInstallStatus();

  const config = {
    installed: {
      icon: CheckCircle2,
      iconClass: "text-[hsl(var(--success))]",
      bg: "bg-[hsl(var(--success-light))]",
      title: "App installed",
      desc: "BizFlow is running as an installed app on this device.",
    },
    available: {
      icon: Download,
      iconClass: "text-primary",
      bg: "bg-primary/10",
      title: "Install available",
      desc: "Add BizFlow to your home screen for a faster, app-like experience.",
    },
    "ios-manual": {
      icon: Smartphone,
      iconClass: "text-primary",
      bg: "bg-primary/10",
      title: "Install on iPhone",
      desc: "Tap the Share button in Safari, then choose “Add to Home Screen”.",
    },
    unsupported: {
      icon: Info,
      iconClass: "text-muted-foreground",
      bg: "bg-muted",
      title: "Install not available",
      desc: "Open this site in Chrome (Android/desktop) or Safari (iOS) to install.",
    },
  }[status];

  const Icon = config.icon;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-4">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 ${config.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${config.iconClass}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">{config.title}</p>
            {status === "installed" && (
              <span className="text-[10px] uppercase tracking-wide bg-[hsl(var(--success-light))] text-[hsl(var(--success))] px-2 py-0.5 rounded-full font-semibold">
                Active
              </span>
            )}
            {status === "available" && (
              <span className="text-[10px] uppercase tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                Ready
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{config.desc}</p>
          {status === "available" && (
            <Button size="sm" onClick={promptInstall} className="mt-3 h-8">
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Install now
            </Button>
          )}
          {status === "ios-manual" && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Share className="w-3 h-3" /> Share → Add to Home Screen
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
