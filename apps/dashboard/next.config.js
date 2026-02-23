/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: process.env.NEXT_PUBLIC_STRICT_MODE === "true",
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
}

module.exports = nextConfig
