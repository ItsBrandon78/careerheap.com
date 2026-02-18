export default function TermsPage() {
  return (
    <section className="bg-bg-secondary px-4 py-16 lg:px-[170px]">
      <article className="mx-auto max-w-[860px] rounded-lg border border-border bg-surface p-8 shadow-card">
        <p className="text-xs font-semibold tracking-[1.5px] text-accent">LEGAL</p>
        <h1 className="mt-3 text-[40px] font-bold text-text-primary">Terms of Service</h1>

        <div className="mt-8 space-y-8 text-sm leading-[1.7] text-text-secondary">
          <section>
            <h2 className="text-2xl font-bold text-text-primary">1. Acceptance of Terms</h2>
            <p className="mt-3">Using CareerHeap means you agree to these terms and all applicable laws.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary">2. License</h2>
            <p className="mt-3">
              We grant a limited, non-exclusive license for personal and professional use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary">3. Acceptable Use</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>No illegal, abusive, or fraudulent activity.</li>
              <li>No attempts to bypass payment or usage limits.</li>
              <li>No reverse engineering or unauthorized copying.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary">4. Billing and Subscriptions</h2>
            <p className="mt-3">
              Paid plans are billed through Stripe and can be canceled according to your active plan terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary">5. Disclaimer</h2>
            <p className="mt-3">
              Career guidance and generated content are provided as-is and do not guarantee interview or hiring outcomes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary">6. Contact</h2>
            <p className="mt-3">
              Questions about these terms can be sent to{' '}
              <a href="mailto:legal@careerheap.com" className="text-accent hover:text-accent-hover">
                legal@careerheap.com
              </a>
              .
            </p>
          </section>
        </div>
      </article>
    </section>
  )
}