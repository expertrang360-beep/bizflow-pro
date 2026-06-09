# Deploy BizFlow to Render + custom domain

End-to-end guide for deploying to **Render** as a Static Site and pointing
**bizflow.smarttechpro.online** at it. Deep links (`/sales`, `/reset-password`,
etc.) work immediately after DNS resolves — no extra redirect config required.

---

## 1. Create the Render service

1. Push this repo to GitHub.
2. In Render → **New + → Static Site** → connect the repo.
3. Render auto-detects [`render.yaml`](./render.yaml). Leave **Build Command**
   and **Publish Directory** **empty** so Render uses the values from
   `render.yaml`:
   - Build: `bun install --frozen-lockfile && bun run build`
   - Publish dir: `./dist`
4. Click **Create Static Site**.

> ⚠️ If you previously set a Build Command in the dashboard (e.g. `bun install`),
> clear it. Dashboard values override `render.yaml` and will break the build.

---

## 2. Environment variables

In the Render service → **Environment** tab, add:

| Key                              | Value                                              |
| -------------------------------- | -------------------------------------------------- |
| `VITE_SUPABASE_URL`              | from Supabase → Settings → API                     |
| `VITE_SUPABASE_PUBLISHABLE_KEY`  | from Supabase → Settings → API (anon key)          |
| `VITE_SUPABASE_PROJECT_ID`       | from Supabase → Settings → General                 |
| `VITE_SITE_URL`                  | `https://bizflow.smarttechpro.online`              |

Save → trigger **Manual Deploy → Clear build cache & deploy**.

---

## 3. Point the custom domain

### In Render
1. Render service → **Settings → Custom Domains → Add Custom Domain**
2. Enter `bizflow.smarttechpro.online`
3. Render shows a target like `bizflow.onrender.com`.

### At your DNS provider (smarttechpro.online)
Add this record:

| Type  | Name      | Value                  | TTL  |
| ----- | --------- | ---------------------- | ---- |
| CNAME | `bizflow` | `bizflow.onrender.com` | Auto |

SSL is issued automatically once DNS propagates (usually a few minutes,
up to 24h).

---

## 4. Configure Supabase Auth for the custom domain

Without this, password-reset emails and confirmation links 404.

Supabase project → **Authentication → URL Configuration**:

- **Site URL**: `https://bizflow.smarttechpro.online`
- **Redirect URLs** (add both):
  - `https://bizflow.smarttechpro.online/**`
  - `https://bizflow.smarttechpro.online/reset-password`

---

## 5. SMTP (custom emails)

Auth → **SMTP Settings** in Supabase. Use your `smarttechpro.online` SMTP:

| Field    | Value                            |
| -------- | -------------------------------- |
| Host     | `mail.smarttechpro.online`       |
| Port     | `587` (STARTTLS) or `465` (SSL)  |
| Username | your SMTP user                   |
| Password | your SMTP password               |
| Sender   | `BizFlow <no-reply@smarttechpro.online>` |

Upload the templates in [`email-templates/`](./email-templates/) under
Auth → **Email Templates**.

---

## 6. Verify

After the first successful deploy, sign in as an owner and visit:

```
https://bizflow.smarttechpro.online/setup-status
```

Everything should be **green** (DB, Auth URL, SMTP, RLS).

Also test a hard refresh on a deep link like `/sales` — it must render the
page, not 404. (The SPA rewrite in `render.yaml` handles this.)

---

## How SPA deep links work on Render

`render.yaml` ships this route block:

```yaml
routes:
  - type: rewrite
    source: /*
    destination: /index.html
```

Any unknown path is internally rewritten to `index.html`, then React Router
takes over. This means a freshly pointed domain serves working deep links
the moment DNS resolves — no Cloudflare worker, `_redirects` file, or other
fallback config needed.
