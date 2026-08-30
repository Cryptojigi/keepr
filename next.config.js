/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    qualities: [75, 85, 90],
    formats: ["image/webp", "image/avif"],
  },
}

module.exports = nextConfig
