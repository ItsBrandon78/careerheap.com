export default function PrivacyPage() {
  return (
    <section className="bg-bg-secondary px-4 py-16 lg:px-[170px]">
      <article className="mx-auto max-w-[860px] rounded-lg border border-border bg-surface p-8 shadow-card">
        <p className="text-xs font-semibold tracking-[1.5px] text-accent">LEGAL</p>
        <h1 className="mt-3 text-[40px] font-bold text-text-primary">Privacy Policy</h1>

        <div className="mt-8 space-y-8 text-sm leading-[1.7] text-text-secondary">
          <section>
            <h2 className="text-2xl font-bold text-text-primary">Introduction</h2>
            <p className="mt-3">
              CareerHeap (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates career tools and educational
              content. This policy explains how we collect, use, and protect your information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary">Information We Collect</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Email address for account and authentication.</li>
              <li>Usage data for tool limits and billing state.</li>
              <li>Tool inputs processed for analysis (not stored as permanent profile content).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary">How We Use Data</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Provide tool results and account access.</li>
              <li>Apply free usage limits and subscription features.</li>
              <li>Maintain service reliability and security.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary">Third-Party Services</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Supabase for authentication and database.</li>
              <li>Stripe for secure payment processing.</li>
              <li>OpenAI for AI-powered generation and analysis.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary">Contact</h2>
            <p className="mt-3">
              Questions about privacy can be sent to{' '}
              <a href="mailto:privacy@careerheap.com" className="text-accent hover:text-accent-hover">
                privacy@careerheap.com
              </a>
              .
            </p>
          </section>
        </div>
      </article>
    </section>
  )
}
