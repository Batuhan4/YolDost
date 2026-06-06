import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: stray lockfiles outside the repo must not
  // change how Vercel/local builds resolve the project.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
