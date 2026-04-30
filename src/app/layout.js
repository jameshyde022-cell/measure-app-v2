import './globals.css'
import { Analytics } from '@vercel/analytics/next'
export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  ),
  title: 'MEASURE — Listing image tool for clothing resellers',
  description: 'Turn basic garment photos into polished listing images with ghost mannequin styling, model images, and measurement annotations.',
  keywords: 'garment measurements, clothing reseller, measurement sheet, eBay seller tool, vintage clothing, ghost mannequin, listing images',
  openGraph: {
    title: 'MEASURE — Listing image tool for clothing resellers',
    description: 'Turn basic garment photos into polished listing images with ghost mannequin styling, model images, and measurement annotations.',
    type: 'website',
    images: [{ url: '/og', width: 1200, height: 630, alt: 'MEASURE — Listing image tool for clothing resellers' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MEASURE — Listing image tool for clothing resellers',
    description: 'Turn basic garment photos into polished listing images with ghost mannequin styling, model images, and measurement annotations.',
    images: ['/og'],
  },
}
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#e8b84b" />
      </head>
      <body>{children}<Analytics /></body>
    </html>
  )
}
