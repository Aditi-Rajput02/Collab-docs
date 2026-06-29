import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Keep pg and yjs out of the client bundle — server-only packages
  serverExternalPackages: ['mysql2', 'yjs', 'y-indexeddb'],
  experimental: {},
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
};

export default nextConfig;
