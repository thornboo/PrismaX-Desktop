import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ["@prismax/database", "@prismax/core", "@prismax/ui"],
};

export default nextConfig;
