import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, ExternalLink, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runChecks, type CheckItem, type CheckStatus } from "@/components/DeploymentChecklist";

/**
 * DOC_LINKS — per-check guidance links shown when an item is missing or optional.
 * Keys must match the `key` values produced by runChecks() in DeploymentChecklist.
 */
const DOC_LINKS: Record<string, { label: string; href: string }[]> = {
  VITE_SUPABASE_URL: [
    { label: "Configure environment variables", href: "https://vitejs.dev/guide/env-and-mode" },
    { label: "Find your backend URL", href: "https://supabase.com/docs/guides/api#api-url-and-keys" },
  ],
  VITE_SUPABASE_PUBLISHABLE_KEY: [
    { label: "Public anon/publishable key", href: "https://supabase.com/docs/guides/api/api-keys" },
  ],
  VITE_SUPABASE_PROJECT_ID: [
    { label: "Project ID location", href: "https://supabase.com/docs/guides/platform/projects" },
  ],
  db: [
    { label: "Row Level Security guide", href: "https://supabase.com/docs/guides/auth/row-level-security" },
    { label: "Database troubleshooting", href: "https://supabase.com/docs/guides/database" },
  ],
  auth: [
    { label: "Sign in to continue", href: "/auth" },
    { label: "Auth setup", href: "https://supabase.com/docs/guides/auth" },
  ],
  org: [
    { label: "Complete onboarding", href: "/onboarding" },
  ],
  sub: [
    { label: "View subscription plans", href: "/subscription" },
  ],
  host: [
    { label: "Deployment guide", href: "/DEPLOY.md" },
    { label: "Update Auth → URL Configuration", href: "https://supabase.com/docs/guides/auth/redirect-urls" },
  ],
};

export default function SetupStatusPage() {
  const navigate = useNavigate();
  const [checks, setChecks] = useState<CheckItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    const result = await runChecks();
    setChecks(result);
    setLastRun(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  const missing = checks.filter((c) => c.status === "missing").length;
  const warn = checks.filter((c) => c.status === "warn").length;
  const ok = checks.filter((c) => c.status === "ok").length;

  const summary = loading
    ? "Running deployment checks…"
    : missing > 0
    ? `${missing} required item${missing === 1 ? "" : "s"} need attention`
    : warn > 0
    ? `Ready to deploy — ${warn} optional item${warn === 1 ? "" : "s"} pending`
    : "All systems configured — ready to deploy";

  return (
    <div className="flex flex-col min-h-full bg-background">
      <header className="gradient-hero px-5 pt-12 pb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-primary-foreground/80 text-sm mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-primary-foreground text-2xl font-bold">Setup Status</h1>
        <p className="text-primary-foreground/70 text-sm mt-1">{summary}</p>
      </header>

      <div className="px-4 py-4 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <StatCard tone="emerald" label="Ready" value={ok} />
          <StatCard tone="amber" label="Optional" value={warn} />
          <StatCard tone="destructive" label="Missing" value={missing} />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {lastRun ? `Last checked ${lastRun.toLocaleTimeString()}` : "Not yet checked"}
          </p>
          <Button size="sm" variant="outline" onClick={() => void run()} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Re-run checks
          </Button>
        </div>

        <ul className="space-y-2">
          {loading && checks.length === 0 && (
            <li className="flex items-center gap-2 text-sm text-muted-foreground p-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Checking components…
            </li>
          )}
          {checks.map((c) => (
            <CheckRow key={c.key} item={c} />
          ))}
        </ul>

        <p className="text-[11px] text-muted-foreground pt-2">
          Server-side secrets (Paystack, AI key, SMTP) are not visible from the browser. Verify them
          in your hosting provider or Cloud secrets before going live.
        </p>
      </div>
    </div>
  );
}

function CheckRow({ item }: { item: CheckItem }) {
  const links = DOC_LINKS[item.key] ?? [];
  const tone =
    item.status === "ok" ? "border-emerald-500/30 bg-emerald-500/5"
    : item.status === "missing" ? "border-destructive/40 bg-destructive/5"
    : item.status === "warn" ? "border-amber-500/40 bg-amber-500/5"
    : "border-border bg-muted/30";

  return (
    <li className={`rounded-2xl border p-4 ${tone}`}>
      <div className="flex items-start gap-3">
        <StatusIcon status={item.status} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm">{item.label}</p>
          {item.hint && <p className="text-xs text-muted-foreground mt-0.5">{item.hint}</p>}
          {item.status !== "ok" && links.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  target={l.href.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/15 rounded-full px-2.5 py-1 transition-colors"
                >
                  {l.label}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === "ok") return <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
  if (status === "missing") return <AlertCircle className="w-5 h-5 text-destructive shrink-0" />;
  if (status === "warn") return <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />;
  return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground shrink-0" />;
}

function StatCard({ tone, label, value }: { tone: "emerald" | "amber" | "destructive"; label: string; value: number }) {
  const cls =
    tone === "emerald" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
    : tone === "amber" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
    : "bg-destructive/10 text-destructive border-destructive/30";
  return (
    <div className={`rounded-2xl border p-3 text-center ${cls}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">{label}</p>
    </div>
  );
}
