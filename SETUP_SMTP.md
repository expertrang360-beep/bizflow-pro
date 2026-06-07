# BizFlow — Custom SMTP + Site URL Setup

This guide makes every authentication email (signup, password reset, magic link, team invite, email change) come from **your own domain (smarttechpro.online)** via your own SMTP server, with every link in those emails pointing to **https://bizflow.smarttechpro.online** — never lovable.app.

---

## 1. Set your Site URL & Redirect URLs in Supabase

Open the Supabase project → **Authentication → URL Configuration**.

| Field | Value |
|---|---|
| **Site URL** | `https://bizflow.smarttechpro.online` |
| **Redirect URLs** (add each) | `https://bizflow.smarttechpro.online/**`<br>`https://bizflow.smarttechpro.online/reset-password`<br>`https://bizflow.smarttechpro.online/` |

> All `{{ .ConfirmationURL }}` and `{{ .SiteURL }}` placeholders in email templates now resolve to your domain.

---

## 2. Configure Custom SMTP

Open **Authentication → Emails → SMTP Settings** in Supabase and toggle **"Enable Custom SMTP"**.

Fill in your SMTP credentials from your hosting provider (cPanel / Hostinger / Namecheap / etc.):

| Field | Example value |
|---|---|
| Sender email | `no-reply@smarttechpro.online` |
| Sender name | `BizFlow` |
| Host | `smtp.smarttechpro.online` (or `mail.smarttechpro.online`) |
| Port | `465` (SSL) **or** `587` (STARTTLS) |
| Username | full email, e.g. `no-reply@smarttechpro.online` |
| Password | the mailbox password from your hosting panel |
| Minimum interval | `60` seconds (Supabase rate-limit) |

Click **Save** and then **Send test email** to verify.

> If you don't yet have a mailbox, create `no-reply@smarttechpro.online` in your hosting panel's Email accounts first.

### Recommended DNS records (improve deliverability)

Add these at your DNS provider for `smarttechpro.online`:

- **SPF (TXT @)** — `v=spf1 include:_spf.<your-host>.com ~all` (exact include is shown in your host's email setup page)
- **DKIM (TXT)** — your hosting panel will generate a DKIM selector + record
- **DMARC (TXT _dmarc)** — `v=DMARC1; p=quarantine; rua=mailto:postmaster@smarttechpro.online`

---

## 3. Paste branded BizFlow email templates

Open **Authentication → Email Templates** and replace each template with the matching file from this repo's `email-templates/` folder:

| Supabase template | File |
|---|---|
| Confirm signup | `email-templates/confirm-signup.html` |
| Reset Password | `email-templates/reset-password.html` |
| Magic Link | `email-templates/magic-link.html` |
| Invite user | `email-templates/invite.html` |
| Change Email Address | `email-templates/change-email.html` |

Update each template's **Subject** to the suggested line at the top of the HTML comment.

---

## 4. Set `VITE_SITE_URL` in your deployment

In Render → your service → **Environment** tab, add:

```
VITE_SITE_URL = https://bizflow.smarttechpro.online
```

This ensures the React app passes your production URL to Supabase on every `signUp` / `resetPasswordForEmail` call, so the magic links in your emails always come back to your domain — even if a user signs up from a preview URL.

After saving, click **Manual Deploy → Clear build cache & deploy**.

---

## 5. Verify end-to-end

1. Go to `https://bizflow.smarttechpro.online`
2. Click **Forgot password** and submit your email.
3. Open the email — sender should be `no-reply@smarttechpro.online`, look BizFlow-branded, and the reset button should point to `https://bizflow.smarttechpro.online/reset-password?...`.
4. Click it, set a new password, sign in.

If anything still points to `lovable.app`:
- Site URL in Supabase is wrong → fix step 1
- `VITE_SITE_URL` not set on Render → fix step 4, redeploy
- Old email cached from before redeploy → request a new one

---

## Render deployment errors — fixed

The previous "JavaScript heap out of memory" + "No open ports detected" failures were caused by:

1. The legacy `type: web + env: static` form, which Render's new dashboard provisions as a Web Service (expects an HTTP listener). The updated `render.yaml` now uses the modern `type: static` schema.
2. `npm`'s memory footprint during `vite build` on small instances. The build now uses `bun` + `NODE_OPTIONS=--max-old-space-size=4096`.

Required env vars on Render (Environment tab):

```
VITE_SUPABASE_URL=https://wkfpauqduzgisbjsrcwx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<paste from your Supabase project>
VITE_SUPABASE_PROJECT_ID=wkfpauqduzgisbjsrcwx
VITE_SITE_URL=https://bizflow.smarttechpro.online
```
