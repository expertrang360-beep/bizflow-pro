# BizFlow

Business management PWA for Nigerian SMEs — sales, inventory, expenses,
customers, suppliers, payroll, manufacturing, and AI advisor.

Stack: React 18 + Vite + TypeScript + Tailwind + shadcn/ui + Supabase
(Postgres, Auth, Storage, Edge Functions).

---

## Quick start (local dev)

```bash
bun install
cp .env.example .env   # values are already filled for the linked Supabase project
bun run dev            # http://localhost:8080
```

Required env vars (build-time, read by Vite):

| Variable                          | Value                                    |
| --------------------------------- | ---------------------------------------- |
| `VITE_SUPABASE_URL`               | `https://gnhidwappdlwuwnuhyoc.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY`   | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `VITE_SUPABASE_PROJECT_ID`        | `gnhidwappdlwuwnuhyoc`                   |
| `VITE_SITE_URL` *(prod only)*     | `https://bizflow.smarttechpro.online`    |

`VITE_SITE_URL` is critical in production — auth emails (password reset,
email confirmation) link back to this URL.

---

## Database

This project now uses your own Supabase project:
- **Project ref**: `gnhidwappdlwuwnuhyoc`
- **Dashboard**: https://supabase.com/dashboard/project/gnhidwappdlwuwnuhyoc

See **[MIGRATE_SUPABASE.md](./MIGRATE_SUPABASE.md)** to apply the schema.

---

## Deploy

See **[DEPLOY_RENDER.md](./DEPLOY_RENDER.md)** for the full Render +
custom-domain walkthrough.

---

## Project layout

```
src/
  pages/           route components
  components/      shared UI (shadcn/ui under components/ui)
  contexts/        AuthContext
  hooks/           useAuth, useSubscription, useInstallStatus, ...
  integrations/supabase/   auto-generated client + types (do NOT edit)
  lib/             helpers (siteUrl, receipt PDF, navigation)
supabase/
  migrations/      database schema history
  functions/       edge functions
email-templates/   custom SMTP HTML templates
```

---

## Useful scripts

```bash
bun run dev        # local dev server (port 8080)
bun run build      # production build → dist/
bun run preview    # serve built dist/ locally
bun run lint       # eslint
bunx vitest run    # tests
```
