export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <h1 className="mb-8 text-4xl font-bold text-gray-900">Privacy Policy</h1>

      <div className="space-y-8 text-gray-600">
        <section>
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Introduction</h2>
          <p>
            CareerHeap (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the careerheap.com website. This page
            informs you of our policies regarding the collection, use, and disclosure of personal data when you use
            our service.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Information We Collect</h2>
          <p>We collect the following information to provide our service:</p>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li><strong>Email address</strong> - Used to track your usage tier and unlock status</li>
            <li><strong>Usage data</strong> - How many times you use each tool</li>
            <li><strong>Tool input data</strong> - Only processed temporarily for AI analysis, not stored</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-bold text-gray-900">How We Use Your Data</h2>
          <ul className="space-y-2 list-disc pl-6">
            <li>Track your free usage limit (3 uses per tool)</li>
            <li>Manage your subscription and payment status</li>
            <li>Improve our service and AI models</li>
            <li>Send important notifications about your account</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Data Storage</h2>
          <p>
            Your data is stored securely in Supabase, a managed PostgreSQL database. We use industry-standard
            encryption to protect your information.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li><strong>Supabase</strong> - Database hosting and authentication</li>
            <li><strong>Stripe</strong> - Payment processing</li>
            <li><strong>OpenAI</strong> - AI analysis and generation</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li>Request deletion of your data</li>
            <li>Know what data we store about you</li>
            <li>Opt-out of communications</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Contact Us</h2>
          <p>
            If you have questions about this privacy policy, please contact us at{' '}
            <a href="mailto:privacy@careerheap.com" className="text-sky-600 hover:underline">
              privacy@careerheap.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
