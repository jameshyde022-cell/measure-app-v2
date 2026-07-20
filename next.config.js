/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.measureapp.pro' }],
        destination: 'https://measureapp.pro/:path*',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
