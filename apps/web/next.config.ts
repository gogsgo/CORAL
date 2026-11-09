import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dashboard reads the local reef DB, so it must run on the same machine
  // as `coral`. No edge runtime, no serverless deploy — the reef is yours.
  experimental: {
    externalDir: true,
  },
  serverExternalPackages: ["better-sqlite3"],
  // Workspace packages are TypeScript source imported through the `@coral/*`
  // entry points. They use ESM `./x.js` specifiers that point at `.ts` files,
  // which webpack must be told about explicitly.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
