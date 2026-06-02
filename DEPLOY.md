# Deploying BizKit

BizKit is a Vite + React SPA. Build with:

```bash
npm install
npm run build
```

This produces a static `dist/` folder. Upload it to any host below — SPA fallback configs are already included so deep links (e.g. `/onboarding`, `/reset-password`) work correctly.

## Per-host setup

| Host                  | Config used                                |
| --------------------- | ------------------------------------------ |
| Netlify / Cloudflare  | `public/_redirects` (copied to `dist/`)    |
| Vercel                | `vercel.json` at project root              |
| Apache                | `public/.htaccess` (copied to `dist/`)     |
| Azure Static Web Apps | `public/staticwebapp.config.json`          |
| Nginx / custom VPS    | See `nginx.conf.example`                   |
| GitHub Pages          | Add a `404.html` that is a copy of `index.html` |

## Password reset & email links

Auth code uses `window.location.origin`, so password-reset and email-verification links automatically point back to whatever domain serves the app — not to lovable.app.

After deploying to your own domain, also update the allowed redirect URLs in **Lovable Cloud → Users → Auth Settings → URL Configuration**:

- **Site URL**: `https://your-domain.com`
- **Redirect URLs**: add `https://your-domain.com/**`

Without this, Supabase Auth will reject the redirect and fall back to the default Site URL.
