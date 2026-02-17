import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { AuthProvider } from '@/lib/auth/context';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
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
      </body>
    </html>
  );
}
