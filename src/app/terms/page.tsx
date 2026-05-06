export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-serif text-3xl text-stone-900">Terms of Service</h1>
      <p className="mt-2 text-sm text-stone-500">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      
      <div className="mt-8 space-y-6 text-sm text-stone-700 leading-relaxed">
        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-2">1. Acceptance of Terms</h2>
          <p>By accessing or using Gessa (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), you agree to be bound by these Terms of Service. If you do not agree, please do not use our service.</p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-2">2. Description of Service</h2>
          <p>Gessa provides AI-powered digital restoration and presentation tools for physical artworks. Our service includes image processing, storage, gallery hosting, and related features.</p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-2">3. User Content and Ownership</h2>
          <p className="mb-2"><strong>You retain full ownership</strong> of all artworks, images, and content you upload to Gessa. We do not claim any ownership rights over your original work.</p>
          <p className="mb-2">By uploading content, you grant us a limited license to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Process and restore your images using AI technology</li>
            <li>Store your images securely for the purpose of providing our service</li>
            <li>Display your artwork publicly <strong>only when you explicitly choose to publish it</strong></li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-2">4. AI Processing Disclaimer</h2>
          <p className="mb-2">Gessa uses artificial intelligence (AI) to assist in digital restoration. <strong>You acknowledge and agree that:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>AI-generated results are tools to assist your artistic judgment, not replacements for it</li>
            <li>You are solely responsible for reviewing and approving any AI-processed images before publication</li>
            <li>We make no guarantees about the accuracy, quality, or artistic fidelity of AI-generated results</li>
            <li>You must compare AI-restored images against your physical artwork before publishing</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-2">5. Prohibited Content</h2>
          <p className="mb-2">You may not upload content that:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>You do not own or have permission to use</li>
            <li>Infringes on any third-party intellectual property rights</li>
            <li>Contains malware, viruses, or harmful code</li>
            <li>Violates any applicable laws or regulations</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-2">6. Subscription and Payments</h2>
          <p>Some features require a paid subscription. By subscribing, you agree to our pricing and billing terms. Subscriptions automatically renew unless cancelled. You may cancel at any time through your account settings.</p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-2">7. Termination</h2>
          <p>We reserve the right to suspend or terminate your account for violations of these terms. You may delete your account at any time. Upon termination, we will retain your data for 30 days to allow for recovery, then permanently delete it.</p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-2">8. Limitation of Liability</h2>
          <p>Gessa is provided &quot;as is&quot; without warranties of any kind. We are not liable for any damages arising from your use of our service, including but not limited to loss of data, artwork quality disputes, or business interruption.</p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-2">9. Changes to Terms</h2>
          <p>We may update these terms from time to time. We will notify you of significant changes via email or through the service. Continued use after changes constitutes acceptance.</p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-2">10. Contact</h2>
          <p>For questions about these terms, please contact us at support@gessa.art.</p>
        </section>
      </div>
    </div>
  );
}
