import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp ships native binaries; keep it external so it loads correctly at
  // runtime instead of being bundled by Turbopack.
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
