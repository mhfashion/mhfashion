/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // MH Fashion Cloudflare R2 public bucket domain will go here once set up
      // { protocol: 'https', hostname: 'assets.mhfashion.com' },
    ],
  },
};

export default nextConfig;
