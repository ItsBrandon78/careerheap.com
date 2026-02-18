import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { AuthProvider } from '@/lib/auth/context';
import { getSiteBaseUrl } from '@/lib/blog/utils';

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
        alt: 'CareerHeap'
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} flex min-h-screen flex-col bg-bg-primary font-body text-text-primary antialiased`}
      >
        <AuthProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
