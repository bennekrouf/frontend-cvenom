import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/auth/', '/_next/', '/private/', '/uploads/'],
    },
    sitemap: 'https://your-domain.com/sitemap.xml',
  }
}
