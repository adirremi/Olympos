export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
}

export function optionalEnv(name: string): string | null {
  const value = Deno.env.get(name);
  return value && value.length > 0 ? value : null;
}

/** Public app URL, e.g. https://mentor.example.com — no trailing slash */
export function appBaseUrl(): string | null {
  return optionalEnv("APP_BASE_URL") ?? "https://olympos-beta.vercel.app";
}

export function todayPageUrl(): string | null {
  const base = appBaseUrl();
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/today`;
}

export function todayPageLinkLine(): string | null {
  const url = todayPageUrl();
  if (!url) return null;
  return `כניסה לאימון היום:\n${url}`;
}
