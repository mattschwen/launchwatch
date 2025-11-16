import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'thespacedevs-prod.nyc3.digitaloceanspaces.com',
        pathname: '/media/**',
      },
      {
        protocol: 'https',
        hostname: 'spacelaunchnow-prod-east.nyc3.digitaloceanspaces.com',
        pathname: '/media/**',
      },
      {
        protocol: 'https',
        hostname: 'images2.imgbox.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
