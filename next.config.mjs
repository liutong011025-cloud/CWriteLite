export default {
  outputFileTracingRoot: process.cwd(),
  distDir: process.env.CWRITE_BUILD_DIR || '.next',
  devIndicators: false,
  images: { unoptimized: true },
  serverExternalPackages: ['@prisma/client', 'prisma'],
  outputFileTracingIncludes: {
    '/api/**/*': ['./node_modules/.prisma/client/**/*'],
    '/api/map-update': ['./public/firstmap.webp','./public/secondmap.webp'],
    '/api/drama-video': ['./public/**/*.webp','./public/**/*.png'],
    '/**/*': ['./node_modules/.prisma/client/**/*'],
  },
  experimental: { serverActions: { bodySizeLimit: '8mb' } },
}
