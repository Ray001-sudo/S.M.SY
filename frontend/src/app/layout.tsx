import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Toaster } from 'react-hot-toast';
import { PerformanceBar } from '@/components/ui/PerformanceBar';

export const metadata: Metadata = {
  title: { default: 'Shule360', template: '%s · Shule360' },
  description: 'AI-native dual-curriculum school management — 8-4-4 & CBC/CBE',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Shule360' },
  formatDetection: { telephone: false },
  openGraph: { type: 'website', title: 'Shule360', description: 'AI-native school management for Kenya' },
};

export const viewport: Viewport = {
  themeColor: '#0B1D35',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <Providers>
          <PerformanceBar />
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: { fontFamily: 'DM Sans, sans-serif', fontSize: '14px', borderRadius: '12px' }
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
