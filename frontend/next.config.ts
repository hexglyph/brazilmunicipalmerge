import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hexglyph.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
