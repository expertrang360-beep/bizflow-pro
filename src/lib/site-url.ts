/**
 * Returns the canonical site URL used for auth redirects (password reset,
 * email confirmation, OAuth callbacks). Prefer the build-time `VITE_SITE_URL`
 * environment variable so production emails always link back to your own
 * domain (e.g. https://bizflow.smarttechpro.online) instead of whatever
 * origin the user happened to sign up from (preview URLs, lovable.app, etc.).
 *
 * Set in Render / Vercel / Netlify environment:
 *   VITE_SITE_URL=https://bizflow.smarttechpro.online
 */
export function getSiteUrl(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL as string | undefined;
  if (fromEnv && /^https?:\/\//.test(fromEnv)) {
    return fromEnv.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

export function siteUrl(path = "/"): string {
  const base = getSiteUrl();
  if (!path.startsWith("/")) path = "/" + path;
  return `${base}${path}`;
}
