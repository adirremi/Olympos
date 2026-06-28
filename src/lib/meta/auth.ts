export const META_GRAPH_VERSION = "v21.0";
export const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

// Scopes needed to list pages, publish to a Facebook Page, and publish to the
// Instagram Business account linked to that page.
export const META_SCOPES = [
  "public_profile",
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "business_management",
  "instagram_basic",
  "instagram_content_publish",
].join(",");

export function getMetaAppId() {
  return (
    process.env.META_APP_ID ?? process.env.NEXT_PUBLIC_META_APP_ID ?? ""
  );
}

export function getMetaAppSecret() {
  return process.env.META_APP_SECRET ?? "";
}

export function getAppBaseUrl() {
  return process.env.APP_BASE_URL ?? "http://localhost:3000";
}

export function getMetaRedirectUri() {
  return `${getAppBaseUrl()}/api/meta/callback`;
}

export function buildMetaAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: getMetaAppId(),
    redirect_uri: getMetaRedirectUri(),
    response_type: "code",
    scope: META_SCOPES,
    state,
  });

  return `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

type TokenResult = {
  accessToken: string;
  expiresAt: string | null;
};

function expiresInToIso(expiresIn?: number): string | null {
  return expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
}

export async function exchangeMetaCodeForToken(
  code: string,
): Promise<TokenResult> {
  const appId = getMetaAppId();
  const appSecret = getMetaAppSecret();

  if (!appId || !appSecret) {
    throw new Error("Meta OAuth is not configured.");
  }

  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: getMetaRedirectUri(),
    code,
  });

  const response = await fetch(
    `${META_GRAPH_BASE}/oauth/access_token?${params.toString()}`,
  );
  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string };
  };

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error?.message ?? "Meta token exchange failed.");
  }

  return {
    accessToken: payload.access_token,
    expiresAt: expiresInToIso(payload.expires_in),
  };
}

// Exchange a short-lived user token for a long-lived one (~60 days).
export async function getLongLivedUserToken(
  shortToken: string,
): Promise<TokenResult> {
  const appId = getMetaAppId();
  const appSecret = getMetaAppSecret();

  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortToken,
  });

  const response = await fetch(
    `${META_GRAPH_BASE}/oauth/access_token?${params.toString()}`,
  );
  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string };
  };

  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error?.message ?? "Meta long-lived token exchange failed.",
    );
  }

  return {
    accessToken: payload.access_token,
    expiresAt: expiresInToIso(payload.expires_in),
  };
}
