# Deploying BizKit

BizKit is a Vite + React SPA built with `npm run build` → `dist/`.
Every supported host has a config file checked into this repo so deep links
(`/onboarding`, `/reset-password`, `/setup-status`, etc.) work out of the box.

## One-time setup on any host

Set these three environment variables in your host's dashboard (build-time vars for Vite):

| Variable                          | Where to find it                             |
| --------------------------------- | -------------------------------------------- |
| `VITE_SUPABASE_URL`               | Backend → Project Settings → API → URL       |
| `VITE_SUPABASE_PUBLISHABLE_KEY`   | Backend → Project Settings → API → anon key  |
| `VITE_SUPABASE_PROJECT_ID`        | Backend → Project Settings → General         |

Then add your production domain to **Backend → Users → Auth Settings → URL Configuration**:

- **Site URL**: `https://your-domain.com`
- **Redirect URLs**: `https://your-domain.com/**`

Without this, password-reset and email-verification links will reject your domain.

## Per-host config

| Host                  | File used                                  | Build command           | Publish dir |
| --------------------- | ------------------------------------------ | ----------------------- | ----------- |
| **Vercel**            | `vercel.json`                              | auto (Vite preset)      | `dist`      |
| **Render**            | `render.yaml`                              | `npm ci && npm run build` | `dist`    |
| **Netlify**           | `netlify.toml`                             | `npm ci && npm run build` | `dist`    |
| **Cloudflare Pages**  | `public/_redirects`                        | `npm run build`         | `dist`      |
| **Apache**            | `public/.htaccess`                         | —                       | `dist`      |
| **Azure Static Apps** | `public/staticwebapp.config.json`          | —                       | `dist`      |
| **Nginx / VPS**       | see `nginx.conf.example`                   | —                       | `dist`      |
| **GitHub Pages**      | copy `dist/index.html` to `dist/404.html`  | `npm run build`         | `dist`      |
| **`npx serve`**       | `public/serve.json`                        | `npm run build`         | `dist`      |

All configs include:
- SPA fallback (`/* → /index.html`)
- Immutable cache headers for `/assets/*`
- Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`)

## Verify after deploying

1. Visit `https://your-domain.com/setup-status` (Owner-only).
2. Re-run the checklist — everything should be green.
3. Deep-link to `https://your-domain.com/reset-password` and refresh; it must NOT 404.

## Routing notes

- Client-side routing is `BrowserRouter`. Unknown paths render the in-app 404, not the host 404.
- `/index`, `/index.html`, `/home`, `/dashboard` redirect to `/`.
- Unauthenticated deep links redirect to `/auth?redirect=<original>` and return after sign-in.
- Auth code uses `window.location.origin`, so reset / verification links match the serving domain automatically.
