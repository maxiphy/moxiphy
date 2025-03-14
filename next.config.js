/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Completely disable ESLint during build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Also ignore TypeScript errors during build
    ignoreBuildErrors: true,
  },
  // Prevent API route errors during build time
  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on `fs` module
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }
    return config;
  },
  // Only expose public environment variables
  env: {
    // No sensitive API keys should be exposed here
  },
};

module.exports = nextConfig;
