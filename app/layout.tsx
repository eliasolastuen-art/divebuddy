import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DiveBuddy',
  description: 'Träningsapp för simhoppare',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DiveBuddy',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0D7377',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sv" style={{ height: '100%' }}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={geist.className}
        style={{ overflow: 'hidden', height: '100%', position: 'fixed', width: '100%' }}
      >
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
