import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'app',
  trailingSlash: true,
};

export default nextConfig;
