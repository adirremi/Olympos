import { META_GRAPH_BASE } from "./auth";

export type MetaPage = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: {
    id: string;
    username?: string;
  } | null;
};

// Fetch all Facebook Pages the user manages, including any linked Instagram
// Business account. The page access_token here is a long-lived page token when
// derived from a long-lived user token.
export async function getMetaPages(userToken: string): Promise<MetaPage[]> {
  const params = new URLSearchParams({
    fields: "id,name,access_token,instagram_business_account{id,username}",
    access_token: userToken,
    limit: "100",
  });

  const response = await fetch(`${META_GRAPH_BASE}/me/accounts?${params.toString()}`);
  const payload = (await response.json()) as {
    data?: MetaPage[];
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Failed to fetch Facebook pages.");
  }

  return payload.data ?? [];
}

// Publish a text (optionally with a link) post to a Facebook Page feed.
export async function publishToFacebookPage(
  pageId: string,
  pageToken: string,
  message: string,
  link?: string,
): Promise<string> {
  const body = new URLSearchParams({ message, access_token: pageToken });
  if (link) {
    body.set("link", link);
  }

  const response = await fetch(`${META_GRAPH_BASE}/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = (await response.json()) as {
    id?: string;
    error?: { message?: string };
  };

  if (!response.ok || !payload.id) {
    throw new Error(payload.error?.message ?? "Facebook publish failed.");
  }

  return payload.id;
}

// Publish a single image to Instagram: create a media container, then publish.
export async function publishImageToInstagram(
  igUserId: string,
  pageToken: string,
  imageUrl: string,
  caption: string,
): Promise<string> {
  const createBody = new URLSearchParams({
    image_url: imageUrl,
    caption,
    access_token: pageToken,
  });

  const createResponse = await fetch(`${META_GRAPH_BASE}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: createBody,
  });
  const createPayload = (await createResponse.json()) as {
    id?: string;
    error?: { message?: string };
  };

  if (!createResponse.ok || !createPayload.id) {
    throw new Error(
      createPayload.error?.message ?? "Instagram media creation failed.",
    );
  }

  const publishBody = new URLSearchParams({
    creation_id: createPayload.id,
    access_token: pageToken,
  });

  const publishResponse = await fetch(
    `${META_GRAPH_BASE}/${igUserId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: publishBody,
    },
  );
  const publishPayload = (await publishResponse.json()) as {
    id?: string;
    error?: { message?: string };
  };

  if (!publishResponse.ok || !publishPayload.id) {
    throw new Error(
      publishPayload.error?.message ?? "Instagram publish failed.",
    );
  }

  return publishPayload.id;
}
