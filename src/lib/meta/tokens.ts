import { createAdminClient } from "@/lib/supabase/admin";
import { META_SCOPES } from "./auth";
import type { MetaPage } from "./api";

export async function saveUserMetaToken(
  userId: string,
  tokens: { accessToken: string; expiresAt: string | null },
) {
  const admin = createAdminClient();

  const { error } = await admin.from("user_meta_tokens").upsert(
    {
      user_id: userId,
      access_token: tokens.accessToken,
      token_expires_at: tokens.expiresAt,
      scopes: META_SCOPES.split(","),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function getUserMetaToken(
  userId: string,
): Promise<{ accessToken: string; expiresAt: string | null } | null> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("user_meta_tokens")
    .select("access_token, token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  const row = data as
    | { access_token: string; token_expires_at: string | null }
    | null;

  if (!row) {
    return null;
  }

  return { accessToken: row.access_token, expiresAt: row.token_expires_at };
}

export async function hasMetaConnection(userId: string) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return false;
    }

    const admin = createAdminClient();
    const { data } = await admin
      .from("user_meta_tokens")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    return Boolean(data);
  } catch {
    return false;
  }
}

// Link a chosen Facebook Page (and its Instagram account, if any) to a business.
// Creates/updates platform_connections rows and stores the page token securely.
export async function linkPageToBusiness(
  businessId: string,
  page: MetaPage,
  expiresAt: string | null,
) {
  const admin = createAdminClient();

  async function upsertConnection(
    provider: "facebook" | "instagram",
    accountId: string,
    accountName: string,
    metadata: Record<string, unknown>,
  ) {
    const { data: connection, error } = await admin
      .from("platform_connections")
      .upsert(
        {
          business_id: businessId,
          provider,
          account_id: accountId,
          account_name: accountName,
          status: "connected",
          metadata,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "business_id,provider" },
      )
      .select("id")
      .single();

    if (error || !connection) {
      throw new Error(error?.message ?? "Failed to save connection.");
    }

    const { error: secretError } = await admin
      .from("platform_connection_secrets")
      .upsert(
        {
          connection_id: connection.id,
          access_token: page.access_token,
          token_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "connection_id" },
      );

    if (secretError) {
      throw new Error(secretError.message);
    }
  }

  await upsertConnection("facebook", page.id, page.name, {
    page_id: page.id,
  });

  if (page.instagram_business_account) {
    await upsertConnection(
      "instagram",
      page.instagram_business_account.id,
      page.instagram_business_account.username ?? page.name,
      {
        ig_user_id: page.instagram_business_account.id,
        page_id: page.id,
      },
    );
  }
}
