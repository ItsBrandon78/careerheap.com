import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-surface bg-navy text-white">
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-4">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-bold text-white">CareerHeap</h3>
            <p className="mt-2 text-sm text-surface">AI-powered career tools to accelerate your growth.</p>
          </div>

          {/* Tools */}
          <div>
            <h4 className="font-semibold text-white">Tools</h4>
            <ul className="mt-4 space-y-2 text-sm text-surface">
              <li>
                <Link href="/tools/resume-analyzer" className="hover:text-primary">
                  Resume Analyzer
                </Link>
              </li>
              <li>
                <Link href="/tools/cover-letter" className="text-gray-600 hover:text-sky-600">
                  Cover Letter Writer
                </Link>
              </li>
              <li>
                <Link href="/tools/interview-prep" className="text-gray-600 hover:text-sky-600">
                  Interview Q&A Prep
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-white">Company</h4>
            <ul className="mt-4 space-y-2 text-sm text-surface">
              <li>
                <Link href="/blog" className="text-gray-600 hover:text-sky-600">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-gray-600 hover:text-sky-600">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-white">Legal</h4>
            <ul className="mt-4 space-y-2 text-sm text-surface">
              <li>
                <Link href="/privacy" className="text-gray-600 hover:text-sky-600">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-600 hover:text-sky-600">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-surface/30 pt-8">
          <p className="text-center text-sm text-surface">
            &copy; {currentYear} CareerHeap. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
