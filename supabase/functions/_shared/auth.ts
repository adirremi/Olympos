import { optionalEnv } from "./env.ts";

/**
 * Cron jobs call Edge Functions through pg_net using a shared bearer secret.
 * We accept either:
 *  - the Supabase service_role JWT (Authorization header from
 *    `supabase functions invoke ... --no-verify-jwt false`)
 *  - a static CRON_SECRET (recommended for pg_cron / pg_net calls)
 */
export function authorizeRequest(request: Request): boolean {
  const header = request.headers.get("authorization") || "";
  const presentedBearer = header.startsWith("Bearer ")
    ? header.slice("Bearer ".length).trim()
    : null;

  const cronSecret = optionalEnv("CRON_SECRET");
  if (cronSecret && presentedBearer === cronSecret) return true;

  const serviceRole = optionalEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceRole && presentedBearer === serviceRole) return true;

  return false;
}
