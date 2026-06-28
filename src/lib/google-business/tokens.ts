import { createAdminClient } from "@/lib/supabase/admin";
import {
  GOOGLE_BUSINESS_SCOPE,
  refreshGoogleAccessToken,
} from "@/lib/google-business/auth";

type StoredTokens = {
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
};

export async function saveUserGoogleTokens(
  userId: string,
  tokens: {
    accessToken: string;
    refreshToken: string | null;
    expiresAt: string | null;
  },
) {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("user_google_tokens")
    .select("refresh_token")
    .eq("user_id", userId)
    .maybeSingle();

  const { error } = await admin.from("user_google_tokens").upsert(
    {
      user_id: userId,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken ?? existing?.refresh_token ?? null,
      token_expires_at: tokens.expiresAt,
      scopes: [GOOGLE_BUSINESS_SCOPE],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function getValidGoogleAccessToken(
  userId: string,
): Promise<string | null> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("user_google_tokens")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    return null;
  }

  const row = data as StoredTokens;
  const expiresAt = row.token_expires_at
    ? new Date(row.token_expires_at).getTime()
    : 0;
  const isExpired = expiresAt > 0 && Date.now() > expiresAt - 60_000;

  if (!isExpired) {
    return row.access_token;
  }

  if (!row.refresh_token) {
    return null;
  }

  const refreshed = await refreshGoogleAccessToken(row.refresh_token);
  await saveUserGoogleTokens(userId, {
    accessToken: refreshed.accessToken,
    refreshToken: row.refresh_token,
    expiresAt: refreshed.expiresAt,
  });

  return refreshed.accessToken;
}

export async function hasGoogleBusinessConnection(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("user_google_tokens")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(data);
}
