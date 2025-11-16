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
        hostname: '**.staticflickr.com',
      },
      {
        protocol: 'https',
        hostname: 'images2.imgbox.com',
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
      },
    ],
  },
};

export default nextConfig;
