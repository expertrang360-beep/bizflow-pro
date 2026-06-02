import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";

type CheckStatus = "ok" | "missing" | "warn" | "loading";

interface CheckItem {
  key: string;
  label: string;
  status: CheckStatus;
  hint?: string;
}

/**
 * DeploymentChecklist
 * Runs lightweight runtime checks for things that MUST be configured before
 * pointing this app at a custom server / domain. Shows owners exactly which
 * variables or components are missing.
 */
export default function DeploymentChecklist({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [checks, setChecks] = useState<CheckItem[]>([]);

  useEffect(() => {
    void runChecks().then(setChecks);
  }, []);

  const missing = checks.filter((c) => c.status === "missing").length;
  const warn = checks.filter((c) => c.status === "warn").length;
  const loading = checks.length === 0;

  const headline = loading
    ? "Checking deployment readiness…"
    : missing > 0
    ? `${missing} required item${missing === 1 ? "" : "s"} missing`
    : warn > 0
    ? `Ready — ${warn} optional item${warn === 1 ? "" : "s"} not set`
    : "All components configured ✓";

  const tone =
    loading ? "border-border bg-muted/30"
    : missing > 0 ? "border-destructive/40 bg-destructive/5"
    : warn > 0 ? "border-amber-500/40 bg-amber-500/5"
    : "border-emerald-500/40 bg-emerald-500/5";

  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
          ) : missing > 0 ? (
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">Deployment checklist</p>
            <p className="text-xs text-muted-foreground truncate">{headline}</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
      </button>

      {open && (
        <ul className="mt-4 space-y-2">
          {checks.map((c) => (
            <li key={c.key} className="flex items-start gap-2 text-sm">
              <StatusIcon status={c.status} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{c.label}</p>
                {c.hint && <p className="text-xs text-muted-foreground">{c.hint}</p>}
              </div>
              <Badge status={c.status} />
            </li>
          ))}
          <li className="text-[11px] text-muted-foreground pt-2 border-t border-border/60">
            Server-side secrets (Paystack, AI key, SMTP) are not visible from the browser.
            Verify them in your hosting provider / Cloud secrets before going live.
          </li>
        </ul>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === "ok") return <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />;
  if (status === "missing") return <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />;
  if (status === "warn") return <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />;
  return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mt-0.5 shrink-0" />;
}

function Badge({ status }: { status: CheckStatus }) {
  const map: Record<CheckStatus, { label: string; cls: string }> = {
    ok: { label: "OK", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
    missing: { label: "Missing", cls: "bg-destructive/10 text-destructive" },
    warn: { label: "Optional", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
    loading: { label: "…", cls: "bg-muted text-muted-foreground" },
  };
  const v = map[status];
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${v.cls}`}>{v.label}</span>;
}

async function runChecks(): Promise<CheckItem[]> {
  const items: CheckItem[] = [];

  // Required client env vars
  const env = import.meta.env;
  items.push(envCheck("VITE_SUPABASE_URL", env.VITE_SUPABASE_URL, true, "Backend API endpoint"));
  items.push(envCheck("VITE_SUPABASE_PUBLISHABLE_KEY", env.VITE_SUPABASE_PUBLISHABLE_KEY, true, "Public client key"));
  items.push(envCheck("VITE_SUPABASE_PROJECT_ID", env.VITE_SUPABASE_PROJECT_ID, true, "Project identifier"));

  // Live backend reachability
  try {
    const { error } = await supabase.from("organizations").select("id").limit(1);
    items.push({
      key: "db",
      label: "Database connection",
      status: error ? "missing" : "ok",
      hint: error ? error.message : "Reachable and RLS-secured",
    });
  } catch (e) {
    items.push({
      key: "db",
      label: "Database connection",
      status: "missing",
      hint: e instanceof Error ? e.message : "Unreachable",
    });
  }

  // Auth session
  const { data: { session } } = await supabase.auth.getSession();
  items.push({
    key: "auth",
    label: "Authenticated session",
    status: session ? "ok" : "missing",
    hint: session ? `Signed in as ${session.user.email ?? session.user.phone ?? "user"}` : "No active session",
  });

  // Organization + active subscription/trial
  if (session) {
    try {
      const { data: orgId } = await supabase.rpc("get_user_organization_id");
      items.push({
        key: "org",
        label: "Organization linked",
        status: orgId ? "ok" : "missing",
        hint: orgId ? "Multi-tenant scope ready" : "Profile has no organization_id",
      });

      const { data: sub } = await supabase.rpc("get_org_subscription");
      items.push({
        key: "sub",
        label: "Active subscription / trial",
        status: sub ? "ok" : "warn",
        hint: sub ? `Plan: ${(sub as { plan_name?: string }).plan_name ?? "active"}` : "No active plan — users will hit feature gates",
      });
    } catch {
      items.push({ key: "org", label: "Organization linked", status: "warn", hint: "Could not verify" });
    }
  }

  // Deployment host hint (non-blocking)
  const host = window.location.hostname;
  const onLovable = host.endsWith("lovable.app") || host.endsWith("lovableproject.com");
  items.push({
    key: "host",
    label: "Custom domain configured",
    status: onLovable ? "warn" : "ok",
    hint: onLovable
      ? `Currently on ${host}. Update Auth → URL Configuration after moving to your domain.`
      : `Serving from ${host}`,
  });

  return items;
}

function envCheck(name: string, val: unknown, required: boolean, hint: string): CheckItem {
  const present = typeof val === "string" && val.length > 0;
  return {
    key: name,
    label: name,
    status: present ? "ok" : required ? "missing" : "warn",
    hint: present ? hint : `Add ${name} to your hosting environment variables`,
  };
}
