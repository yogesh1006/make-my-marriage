import type { NextConfig } from 'next';

const upstream = new URL(process.env.API_UPSTREAM_URL ?? 'http://localhost:5000');

if (
  !['http:', 'https:'].includes(upstream.protocol) ||
  upstream.pathname !== '/' ||
  upstream.search ||
  upstream.hash ||
  upstream.username ||
  upstream.password
) {
  throw new Error('API_UPSTREAM_URL must be an HTTP(S) origin without a path or credentials.');
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${upstream.origin}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
