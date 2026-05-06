export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-serif text-3xl text-stone-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-stone-500">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      
      <div className="mt-8 space-y-6 text-sm text-stone-700 leading-relaxed">
        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-2">1. Information We Collect</h2>
          <p className="mb-2">We collect the following information:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Account information:</strong> Email address, name, and password (encrypted)</li>
            <li><strong>Artwork data:</strong> Images, titles, descriptions, and metadata you upload</li>
            <li><strong>Usage data:</strong> IP address, browser type, and pages visited</li>
            <li><strong>Payment information:</strong> Processed securely by Stripe; we do not store card details</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-2">2. How We Use Your Information</h2>
          <p className="mb-2">We use your information to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide and maintain our service</li>
            <li>Process and restore your artwork images</li>
            <li>Display your published artwork in public galleries</li>
            <li>Send important service notifications (restoration complete, quota alerts)</li>
            <li>Process payments and manage subscriptions</li>
            <li>Improve our AI models and service quality</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-2">3. AI Processing and Data</h2>
          <p className="mb-2"><strong>Important:</strong> Your artwork images are processed by AI services (currently OpenAI via Cloudflare Workers AI). By using our service, you acknowledge that:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Your images are temporarily sent to AI providers for processing</li>
            <li>We do not use your artwork to train AI models without explicit consent</li>
            <li>Processed images are stored securely in our infrastructure</li>
            <li>Original and restored versions remain under your ownership</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-2">4. Data Storage and Security</h2>
          <p className="mb-2">We take data security seriously:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>All data is encrypted in transit (TLS 1.3) and at rest (AES-256)</li>
            <li>Images are stored in secure cloud storage with access controls</li>
            <li>We use Row Level Security (RLS) to ensure you can only access your own data</li>
            <li>Regular security audits and updates are performed</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-2">5. Data Sharing</h2>
          <p className="mb-2">We do not sell your personal information. We may share data with:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Service providers:</strong> Cloud infrastructure (Cloudflare, Supabase), payment processing (Stripe), AI processing (OpenAI via Cloudflare)</li>
            <li><strong>Legal requirements:</strong> When required by law or to protect our rights</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-2">6. Your Rights</h2>
          <p className="mb-2">You have the right to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Correction:</strong> Update inaccurate information</li>
            <li><strong>Deletion:</strong> Delete your account and all associated data</li>
            <li><strong>Portability:</strong> Export your data in a standard format</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-2">7. Data Retention</h2>
          <p>We retain your data for as long as your account is active. Upon account deletion, we will delete your personal information within 30 days, except where required by law to retain certain records.</p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-2">8. Cookies</h2>
          <p>We use essential cookies to maintain your session and authentication. We do not use tracking cookies for advertising purposes.</p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-2">9. Changes to Privacy Policy</h2>
          <p>We may update this policy from time to time. We will notify you of significant changes via email or through the service.</p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-2">10. Contact</h2>
          <p>For privacy-related questions or to exercise your rights, please contact us at privacy@gessa.art.</p>
        </section>
      </div>
    </div>
  );
}
