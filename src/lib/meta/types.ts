export type MetaPlatform = "facebook" | "instagram";

export type PlatformResult = { ok: boolean; id?: string; error?: string };

export type PublishResult = {
  facebook?: PlatformResult;
  instagram?: PlatformResult;
};
