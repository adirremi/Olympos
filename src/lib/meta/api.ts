import { META_GRAPH_BASE } from "./auth";

type MetaErrorPayload = {
  message?: string;
  code?: number;
  error_subcode?: number;
  error_user_title?: string;
  error_user_msg?: string;
};

function formatMetaError(
  error: MetaErrorPayload | undefined,
  fallback: string,
): string {
  if (!error) {
    return fallback;
  }
  const text =
    error.error_user_msg ?? error.error_user_title ?? error.message ?? fallback;
  const code = [error.code, error.error_subcode].filter(Boolean).join("/");
  return code ? `${text} (code ${code})` : text;
}

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
    error?: MetaErrorPayload;
  };

  if (!response.ok || !payload.id) {
    throw new Error(formatMetaError(payload.error, "Facebook publish failed."));
  }

  return payload.id;
}

// Publish a photo (with caption) to a Facebook Page.
export async function publishPhotoToFacebookPage(
  pageId: string,
  pageToken: string,
  imageUrl: string,
  caption: string,
): Promise<string> {
  const body = new URLSearchParams({
    url: imageUrl,
    caption,
    access_token: pageToken,
  });

  const response = await fetch(`${META_GRAPH_BASE}/${pageId}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = (await response.json()) as {
    id?: string;
    post_id?: string;
    error?: MetaErrorPayload;
  };

  if (!response.ok || (!payload.id && !payload.post_id)) {
    throw new Error(
      formatMetaError(payload.error, "Facebook photo publish failed."),
    );
  }

  return payload.post_id ?? payload.id ?? "";
}

// Polls a freshly created Instagram media container until it finishes
// processing (or fails / times out), so media_publish doesn't race it.
async function waitForInstagramContainer(
  containerId: string,
  pageToken: string,
): Promise<void> {
  const maxAttempts = 12;
  const delayMs = 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const params = new URLSearchParams({
      fields: "status_code,status",
      access_token: pageToken,
    });
    const response = await fetch(
      `${META_GRAPH_BASE}/${containerId}?${params.toString()}`,
    );
    const payload = (await response.json()) as {
      status_code?: string;
      status?: string;
      error?: MetaErrorPayload;
    };

    if (payload.status_code === "FINISHED") {
      return;
    }
    if (payload.status_code === "ERROR" || payload.status_code === "EXPIRED") {
      throw new Error(
        formatMetaError(
          payload.error,
          `Instagram could not process the image (${payload.status ?? payload.status_code}).`,
        ),
      );
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  // Fall through: attempt to publish anyway after the wait budget is spent.
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
    error?: MetaErrorPayload;
  };

  if (!createResponse.ok || !createPayload.id) {
    throw new Error(
      formatMetaError(createPayload.error, "Instagram media creation failed."),
    );
  }

  // Instagram processes the container asynchronously (it downloads the image).
  // Publishing before it is FINISHED fails with "media not ready" (code 9007).
  await waitForInstagramContainer(createPayload.id, pageToken);

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
    error?: MetaErrorPayload;
  };

  if (!publishResponse.ok || !publishPayload.id) {
    throw new Error(
      formatMetaError(publishPayload.error, "Instagram publish failed."),
    );
  }

  return publishPayload.id;
}
