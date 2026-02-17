export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <h1 className="mb-8 text-4xl font-bold text-gray-900">Terms of Service</h1>

      <div className="space-y-8 text-gray-600">
        <section>
          <h2 className="mb-4 text-2xl font-bold text-gray-900">1. Acceptance of Terms</h2>
          <p>
            By using CareerHeap (&quot;Service&quot;), you agree to be bound by these terms. If you do not agree to
            these terms, do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-bold text-gray-900">2. Use License</h2>
          <p>
            We grant you a limited, non-exclusive, non-transferable license to use the Service for personal,
            non-commercial purposes.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-bold text-gray-900">3. Acceptable Use</h2>
          <p>You agree not to use the Service for:</p>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li>Illegal activities or violating any laws</li>
            <li>Harassing or abusing other users</li>
            <li>Attempting to breach security measures</li>
            <li>Circumventing usage limits or payment requirements</li>
            <li>Reverse engineering or copying our technology</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-bold text-gray-900">4. Intellectual Property</h2>
          <p>
            All content, features, and functionality of the Service are owned exclusively by CareerHeap. You may not
            reproduce, distribute, or transmit any content without our permission.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-bold text-gray-900">5. Disclaimer of Warranties</h2>
          <p>
            The Service is provided &quot;as is&quot; without warranties of any kind, express or implied. We do not
            guarantee that the Service will be error-free or uninterrupted.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-bold text-gray-900">6. Limitation of Liability</h2>
          <p>
            CareerHeap shall not be liable for any indirect, incidental, special, consequential, or punitive damages
            arising from your use of the Service.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-bold text-gray-900">7. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless CareerHeap from any claims, damages, or costs arising from your
            use of the Service or violation of these terms.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-bold text-gray-900">8. Termination</h2>
          <p>
            We reserve the right to terminate your access to the Service at any time for violation of these terms or
            for any reason.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-bold text-gray-900">9. Changes to Terms</h2>
          <p>
            We may modify these terms at any time. Your continued use of the Service constitutes acceptance of the
            updated terms.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-bold text-gray-900">10. Contact Us</h2>
          <p>
            If you have questions about these terms, please contact us at{' '}
            <a href="mailto:legal@careerheap.com" className="text-sky-600 hover:underline">
              legal@careerheap.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
