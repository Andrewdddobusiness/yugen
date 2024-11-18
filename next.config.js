/**
 * @type {import('next/dist/server/config').NextConfig}
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@radix-ui/react-slot", "@radix-ui/react-dialog", "framer-motion"],
  experimental: {
    optimizeCss: true,
    // If you're using app directory
    appDir: true,
  },
  webpack: (config, { isServer }) => {
    // Add any necessary webpack configurations
    return config;
  },
};

module.exports = nextConfig;

module.exports = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};
