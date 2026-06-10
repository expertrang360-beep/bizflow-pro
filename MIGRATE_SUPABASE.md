# Migrate Database to Your Own Supabase Project

Your new Supabase project is already linked (`gnhidwappdlwuwnuhyoc`).  
This guide applies the BizFlow schema to it.

---

## Option A — Supabase CLI (recommended)

Run this from your local clone of the repo:

```bash
# Ensure you are linked to the new project
supabase link --project-ref gnhidwappdlwuwnuhyoc

# Push all migrations
supabase db push
```

This applies the 21 migration files in `supabase/migrations/` in order.

---

## Option B — SQL Editor (fallback)

If the CLI fails or you prefer the dashboard:

1. Open your Supabase project → **SQL Editor**
2. Paste the contents of `bizflow_schema.sql` (download from the generated artifact)
3. Click **Run**

---

## After schema is applied

### 1. Update Auth URL Configuration

Go to **Authentication → URL Configuration** in your new Supabase project:

- **Site URL**: `https://bizflow.smarttechpro.online`
- **Redirect URLs**:
  - `https://bizflow.smarttechpro.online/**`
  - `https://bizflow.smarttechpro.online/reset-password`

### 2. Enable Email Provider

Go to **Authentication → Providers → Email** and ensure it is enabled.

### 3. Set Edge Function Secrets

Your new project needs the same secrets as the old one. In **Project Settings → Edge Functions → Secrets**, add:

| Secret Name | Value |
|-------------|-------|
| `PAYSTACK_SECRET_KEY` | Your Paystack test/live secret |
| `SUPABASE_URL` | `https://gnhidwappdlwuwnuhyoc.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | From Settings → API |
| `OPENAI_API_KEY` | (optional) For AI advisor |

### 4. Regenerate TypeScript Types

```bash
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

### 5. Deploy Edge Functions

```bash
supabase functions deploy
```

---

## Verify

Sign up at your deployed URL. The first user becomes:
- **Organization owner**
- **Super admin** (platform-wide)

Check `/setup-status` after signing in to confirm everything is green.
