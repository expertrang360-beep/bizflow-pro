
## What I'll do

### 1. Install status indicator
Add a small visible indicator (in the header or `MorePage`) that shows one of three states:
- **Installed** — green badge "App installed" (detected via `display-mode: standalone` or iOS `navigator.standalone`)
- **Available** — blue badge "Install available" with an Install button (uses captured `beforeinstallprompt`)
- **Not supported** — subtle gray "Open in Chrome/Safari to install" (covers desktop Firefox, in-app browsers, etc.)

Implementation: extract the install detection from `InstallPrompt.tsx` into a shared `useInstallStatus()` hook so both the floating prompt and the new `InstallStatusBadge` component stay in sync. Add the badge to `MorePage` (Settings area) and optionally the top bar.

### 2. Render deployment + custom domain
- Keep `render.yaml` as the source of truth (already correct: static site, `bun run build`, publish `./dist`).
- Add a single `DEPLOY_RENDER.md` with screenshots-style steps:
  1. Connect repo → Render auto-reads `render.yaml`
  2. Set env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SITE_URL`)
  3. Connect `bizflow.smarttechpro.online` in Render dashboard → add CNAME at smarttechpro.online DNS
  4. Add the domain to Supabase Auth → URL Configuration (Site URL + Redirect URLs `https://bizflow.smarttechpro.online/**`)
- Verify `public/_redirects`, `public/.htaccess`, `public/staticwebapp.config.json`, `vercel.json`, and `netlify.toml` all have SPA fallback so deep links work **immediately after DNS points** — no extra redirect needed. (They do, but I'll double-check Render's static routes block in `render.yaml` covers `/auth`, `/reset-password`, etc.)

### 3. Repo cleanup
Remove files that are not used by Render or the app:
- `Dockerfile`, `Dockerfile.dev`, `docker-compose.yml`, `.dockerignore` (not used for Render static)
- `.github/workflows/webpack.yml` (project is Vite, not webpack)
- `nginx.conf.example`, `public/serve.json`, `public/staticwebapp.config.json` (keep only if you want them — I'll ask)
- `build.sh` (redundant with `render.yaml`)
- `SETUP_SMTP.md` merged into a single `SETUP.md`
- Consolidate `DEPLOY.md` + `DEVELOPMENT.md` + `README.md` → one clean `README.md` plus `DEPLOY_RENDER.md`

### 4. Auth redirects work on first DNS point
- All auth code already uses `getSiteUrl()` from `src/lib/site-url.ts` which prefers `VITE_SITE_URL`. I'll audit `AuthPage.tsx`, `ResetPasswordPage.tsx`, and any `signUp/resetPasswordForEmail/signInWithOAuth` calls to confirm none still hardcode `window.location.origin`.
- Document the one-time Supabase Auth URL Configuration step (Site URL + wildcard redirect) — without it emails 404.

### 5. Database access for `expertrang360@gmail.com`
**I can't transfer the Lovable Cloud (Supabase) backend ownership to your personal Supabase account from here** — that's a manual one-time step you do in the Lovable dashboard:

> **Project Settings → Cloud → Disconnect / Transfer**, then in your personal Supabase account create a new project and reconnect, OR use the existing Lovable-managed project (you already have full access through the Lovable UI under the **Cloud** tab — Tables, Auth, Storage, Edge Functions, Secrets are all there).

If what you actually want is **direct Supabase dashboard access with your Google account**, the cleanest path is:
1. Create a free Supabase account at supabase.com with `expertrang360@gmail.com`
2. Create a new project there
3. Tell me to switch the app from Lovable Cloud to your external Supabase project — I'll run the migrations against it and swap the keys

I need you to confirm which path you want before I touch anything backend-related.

---

## Questions before I start

1. **Database**: Do you want to (a) keep using the current Lovable Cloud backend and just access it via the Lovable UI's **Cloud** tab, or (b) migrate everything to a new Supabase project you create under your own `expertrang360@gmail.com` account? Option (b) takes ~10 min and you get the supabase.com dashboard.

2. **Cleanup scope**: OK to delete Docker files, the webpack GH Action, `build.sh`, `nginx.conf.example`, and merge the markdown docs into a single `README.md` + `DEPLOY_RENDER.md`? Or do you want to keep any of them?

3. **Install indicator placement**: Header (always visible) or inside `More → Settings` (less noisy)?
