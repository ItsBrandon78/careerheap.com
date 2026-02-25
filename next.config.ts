import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@napi-rs/canvas'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io'
      }
    ]
  }
}

export default nextConfig
