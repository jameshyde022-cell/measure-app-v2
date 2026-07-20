export default function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://measureapp.pro'

  const routes = ['/', '/pricing', '/login', '/signup', '/terms', '/privacy', '/refund-policy', '/contact']

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
  }))
}
