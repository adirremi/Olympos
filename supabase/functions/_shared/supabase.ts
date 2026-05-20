import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { requireEnv } from "./env.ts";

export function createServiceClient() {
  const url = requireEnv("SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
