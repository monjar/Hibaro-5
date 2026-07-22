/** @type {import('next').NextConfig} */
const nextConfig = {
  // The admin app is deployed on its own domain, so it serves at the root.
  // (Set basePath only if you host it under a sub-path behind a shared proxy.)
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
