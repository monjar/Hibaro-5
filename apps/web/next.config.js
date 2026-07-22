/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },
  // Linting runs in CI / pre-commit, not as a production-build gate.
  // TypeScript type-checking still gates the build.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
