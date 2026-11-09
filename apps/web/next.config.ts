import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The reef dashboard reads a local SQLite file through Node's built-in
  // node:sqlite, so this app has no native dependency and imports no workspace
  // package. That makes it a plain Node service: no edge runtime, no serverless
  // target, no bundler extension hacks.
  // Deliberately NOT `output: "standalone"` — its trace step copies symlinks,
  // which fails on Windows without developer mode, and `next start` runs the
  // built app fine from .next with nothing lost.
  poweredByHeader: false,
  images: {
    // Plates are pre-optimised WebP, served as-is.
    unoptimized: true,
  },
};

export default nextConfig;
