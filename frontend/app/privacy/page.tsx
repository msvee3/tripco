import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Privacy Policy</h1>
      <p className="mb-4 text-sm text-gray-500">Last updated: March 16, 2026</p>

      <div className="prose prose-gray max-w-none space-y-6 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">1. Introduction</h2>
          <p>
            Tripco (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your
            personal data in accordance with the General Data Protection Regulation (GDPR) and
            applicable data-protection laws. This Privacy Policy explains what data we collect, why
            we collect it, how we use it, and what rights you have.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">2. Data We Collect</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Account data</strong> – name, email address, and hashed password when you register.</li>
            <li><strong>Trip data</strong> – trips, itineraries, expenses, food logs, tickets, and memories you create.</li>
            <li><strong>Media</strong> – photos and files you upload to your trips.</li>
            <li><strong>Usage data</strong> – basic technical information such as browser type and access timestamps needed for security and performance.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">3. Legal Basis for Processing</h2>
          <p>We process your data on the following legal bases:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Contract performance</strong> – to provide the Tripco service you signed up for.</li>
            <li><strong>Legitimate interest</strong> – to secure the platform and improve functionality.</li>
            <li><strong>Consent</strong> – for optional cookies and analytics (you can withdraw at any time).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">4. How We Use Your Data</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>To create and manage your account and trips.</li>
            <li>To sync your data across devices.</li>
            <li>To generate expense summaries and CSV exports.</li>
            <li>To send essential service notifications (e.g., password changes).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">5. Data Storage &amp; Security</h2>
          <p>
            Your data is stored in Azure Cosmos DB and Azure Blob Storage with encryption at rest
            and in transit. Passwords are hashed using bcrypt and are never stored in plain text.
            Access tokens are short-lived JWTs.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">6. Cookies</h2>
          <p>
            Tripco uses only essential cookies required for authentication and session management.
            No third-party advertising or tracking cookies are used. You may accept or decline
            cookies via the banner shown on your first visit.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">7. Your Rights (GDPR)</h2>
          <p>Under GDPR you have the right to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Access</strong> – request a copy of all personal data we hold about you (available via the &quot;Export My Data&quot; button on your <Link href="/profile" className="text-brand-600 underline hover:text-brand-700">Profile</Link> page).</li>
            <li><strong>Rectification</strong> – update inaccurate data through your profile settings.</li>
            <li><strong>Erasure (&quot;Right to be Forgotten&quot;)</strong> – permanently delete your account and all associated data via the <Link href="/profile" className="text-brand-600 underline hover:text-brand-700">Profile</Link> page.</li>
            <li><strong>Data portability</strong> – export your data in a machine-readable JSON format.</li>
            <li><strong>Restriction / Objection</strong> – contact us to restrict or object to certain processing.</li>
            <li><strong>Withdraw consent</strong> – you may withdraw cookies consent at any time by clearing your browser storage.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">8. Data Retention</h2>
          <p>
            We retain your data for as long as your account is active. When you delete your account,
            all personal data, trips, memories, and uploaded media are permanently removed within 30
            days.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">9. Third-Party Sharing</h2>
          <p>
            We do not sell, rent, or share your personal data with third parties for marketing
            purposes. Data may be shared with cloud infrastructure providers (Microsoft Azure) solely
            for hosting and storage as a data processor under GDPR.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">10. Contact</h2>
          <p>
            For any privacy-related questions or to exercise your rights, please contact us at{" "}
            <a href="mailto:privacy@tripco.app" className="text-brand-600 underline hover:text-brand-700">
              privacy@tripco.app
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
