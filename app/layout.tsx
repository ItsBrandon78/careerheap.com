import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AccessibilityMenu from '@/components/AccessibilityMenu';
import { AuthProvider } from '@/lib/auth/context';
import { accessibilityInitScript } from '@/lib/accessibility/preferences';
import { getSiteBaseUrl } from '@/lib/blog/utils';
import { reportMissingEnvInDev } from '@/lib/server/envValidation';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteBaseUrl()),
  title: 'CareerHeap | AI-Powered Career Tools',
  description:
    'Accelerate your career with AI-powered tools for resume analysis, cover letter writing, and interview preparation.',
  keywords: 'career, resume, cover letter, interview prep, AI',
  openGraph: {
    title: 'CareerHeap | AI-Powered Career Tools',
    description:
      'Accelerate your career with AI-powered tools for resume analysis, cover letter writing, and interview preparation.',
    type: 'website',
    locale: 'en_US',
    url: getSiteBaseUrl(),
    images: [
      {
        url: `${getSiteBaseUrl()}/og-blog-default.svg`,
        alt: 'CareerHeap career tools and guides preview'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CareerHeap | AI-Powered Career Tools',
    description:
      'Accelerate your career with AI-powered tools for resume analysis, cover letter writing, and interview preparation.',
    images: [`${getSiteBaseUrl()}/og-blog-default.svg`]
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' }
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }]
  },
  manifest: '/manifest.webmanifest'
};

export const viewport: Viewport = {
  themeColor: '#245DFF'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  reportMissingEnvInDev();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} flex min-h-screen flex-col bg-bg-primary font-body text-text-primary antialiased`}
      >
        <Script id="a11y-preferences-init" strategy="beforeInteractive">
          {accessibilityInitScript}
        </Script>
        <a
          href="#main-content"
          className="skip-link"
        >
          Skip to main content
        </a>
        <AuthProvider>
          <Header />
          <main id="main-content" className="flex-1" tabIndex={-1}>
            {children}
          </main>
          <Footer />
          <AccessibilityMenu />
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
