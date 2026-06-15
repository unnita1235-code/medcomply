// frontend/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produce .next/standalone with server.js and minimal node_modules
  output: 'standalone',
  reactStrictMode: true,
  // Ensure App Router is enabled (default for Next 13+)
  experimental: {
    appDir: true
  },
  // Add any other production‑safe settings you need here
};

module.exports = nextConfig;
