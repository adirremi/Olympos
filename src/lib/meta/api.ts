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

// Upload an unpublished photo to a Page (used as a child of a multi-photo post).
async function uploadUnpublishedFacebookPhoto(
  pageId: string,
  pageToken: string,
  imageUrl: string,
): Promise<string> {
  const body = new URLSearchParams({
    url: imageUrl,
    published: "false",
    access_token: pageToken,
  });

  const response = await fetch(`${META_GRAPH_BASE}/${pageId}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = (await response.json()) as {
    id?: string;
    error?: MetaErrorPayload;
  };

  if (!response.ok || !payload.id) {
    throw new Error(
      formatMetaError(payload.error, "Facebook unpublished photo upload failed."),
    );
  }

  return payload.id;
}

// Publish multiple photos as a single Facebook Page post (album-style).
export async function publishAlbumToFacebookPage(
  pageId: string,
  pageToken: string,
  imageUrls: string[],
  caption: string,
): Promise<string> {
  if (imageUrls.length === 0) {
    throw new Error("Facebook album requires at least one image.");
  }
  if (imageUrls.length === 1) {
    return publishPhotoToFacebookPage(pageId, pageToken, imageUrls[0], caption);
  }

  const mediaIds: string[] = [];
  for (const url of imageUrls.slice(0, 10)) {
    mediaIds.push(await uploadUnpublishedFacebookPhoto(pageId, pageToken, url));
  }

  const body = new URLSearchParams({
    message: caption,
    access_token: pageToken,
  });
  mediaIds.forEach((id, index) => {
    body.set(`attached_media[${index}]`, JSON.stringify({ media_fbid: id }));
  });

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
    throw new Error(
      formatMetaError(payload.error, "Facebook album publish failed."),
    );
  }

  return payload.id;
}

// Publish a video to a Facebook Page via a publicly reachable URL.
export async function publishVideoToFacebookPage(
  pageId: string,
  pageToken: string,
  videoUrl: string,
  description: string,
): Promise<string> {
  const body = new URLSearchParams({
    file_url: videoUrl,
    description,
    access_token: pageToken,
  });

  const response = await fetch(`${META_GRAPH_BASE}/${pageId}/videos`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = (await response.json()) as {
    id?: string;
    error?: MetaErrorPayload;
  };

  if (!response.ok || !payload.id) {
    throw new Error(
      formatMetaError(payload.error, "Facebook video publish failed."),
    );
  }

  return payload.id;
}

// Polls a freshly created Instagram media container until it finishes
// processing (or fails / times out), so media_publish doesn't race it.
async function waitForInstagramContainer(
  containerId: string,
  pageToken: string,
  maxAttempts = 12,
  delayMs = 2000,
): Promise<void> {
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
          `Instagram could not process the media (${payload.status ?? payload.status_code}).`,
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

  return publishInstagramContainer(igUserId, pageToken, createPayload.id);
}

async function publishInstagramContainer(
  igUserId: string,
  pageToken: string,
  creationId: string,
): Promise<string> {
  const publishBody = new URLSearchParams({
    creation_id: creationId,
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

// Publish multiple images as an Instagram carousel (max 10).
export async function publishCarouselToInstagram(
  igUserId: string,
  pageToken: string,
  imageUrls: string[],
  caption: string,
): Promise<string> {
  if (imageUrls.length === 0) {
    throw new Error("Instagram carousel requires at least one image.");
  }
  if (imageUrls.length === 1) {
    return publishImageToInstagram(igUserId, pageToken, imageUrls[0], caption);
  }

  const childIds: string[] = [];
  for (const url of imageUrls.slice(0, 10)) {
    const createBody = new URLSearchParams({
      image_url: url,
      is_carousel_item: "true",
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
        formatMetaError(
          createPayload.error,
          "Instagram carousel item creation failed.",
        ),
      );
    }

    await waitForInstagramContainer(createPayload.id, pageToken);
    childIds.push(createPayload.id);
  }

  const parentBody = new URLSearchParams({
    media_type: "CAROUSEL",
    children: childIds.join(","),
    caption,
    access_token: pageToken,
  });

  const parentResponse = await fetch(`${META_GRAPH_BASE}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: parentBody,
  });
  const parentPayload = (await parentResponse.json()) as {
    id?: string;
    error?: MetaErrorPayload;
  };

  if (!parentResponse.ok || !parentPayload.id) {
    throw new Error(
      formatMetaError(
        parentPayload.error,
        "Instagram carousel creation failed.",
      ),
    );
  }

  await waitForInstagramContainer(parentPayload.id, pageToken);
  return publishInstagramContainer(igUserId, pageToken, parentPayload.id);
}

// Publish a video as an Instagram Reel (Graph API media_type=REELS).
export async function publishVideoToInstagram(
  igUserId: string,
  pageToken: string,
  videoUrl: string,
  caption: string,
): Promise<string> {
  const createBody = new URLSearchParams({
    media_type: "REELS",
    video_url: videoUrl,
    caption,
    share_to_feed: "true",
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
      formatMetaError(createPayload.error, "Instagram Reel creation failed."),
    );
  }

  // Reels take longer to process than still images.
  await waitForInstagramContainer(createPayload.id, pageToken, 30, 3000);
  return publishInstagramContainer(igUserId, pageToken, createPayload.id);
}
