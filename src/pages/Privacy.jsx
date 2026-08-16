import React from "react";
import PublicLayout from "@/components/PublicLayout";

export default function Privacy() {
  return (
    <PublicLayout>
      <article className="space-y-6">
        <h1 className="font-heading text-4xl font-bold text-white">Privacy Policy</h1>
        <p className="text-xs text-zinc-500">Last updated: August 9, 2026</p>
        <div className="space-y-5 leading-relaxed text-zinc-300">
          <p>
            This Privacy Policy explains how PackPulseDrops ("we," "us") collects, uses, and protects your information when you use our platform (the "Service").
          </p>
          <section>
            <h2 className="font-heading text-xl font-bold text-white">1. Information we collect</h2>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li><span className="font-semibold text-white">Account data:</span> name, email address, and authentication details when you register.</li>
              <li><span className="font-semibold text-white">Transaction data:</span> gem purchases, pack opens, marketplace sales, and withdrawal requests, processed through Stripe.</li>
              <li><span className="font-semibold text-white">Bank/payout data:</span> information you provide to connect a bank account for withdrawals, handled by Stripe.</li>
              <li><span className="font-semibold text-white">Usage data:</span> how you interact with packs, the marketplace, and platform features.</li>
            </ul>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-white">2. How we use your information</h2>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>To create and manage your account and vault.</li>
              <li>To process payments and withdrawals.</li>
              <li>To operate the marketplace, referrals, rewards, and leaderboards.</li>
              <li>To send service notifications, such as withdrawal updates and optional vault digests.</li>
              <li>To detect and prevent fraud and abuse.</li>
            </ul>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-white">3. Payment processing</h2>
            <p className="mt-2">
              Payments and payouts are processed by Stripe. We do not store your full card or bank account numbers — that data is handled by Stripe under its own privacy and security standards. See <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer" className="text-amber-300 underline">Stripe's Privacy Policy</a> for details.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-white">4. Data sharing</h2>
            <p className="mt-2">
              We share data only as needed to operate the Service — for example, with Stripe for payments, or with email providers for notifications. We do not sell your personal information. Public activity, such as your name appearing on the live pulls feed or leaderboard, may be visible to other users.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-white">5. Data retention & deletion</h2>
            <p className="mt-2">
              We retain your data for as long as your account is active. You may delete your account at any time from the app settings, which removes your personal data from active use, subject to records we must keep for legal, tax, or fraud-prevention purposes.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-white">6. Security</h2>
            <p className="mt-2">
              We take reasonable measures to protect your data, including authentication controls and service-side validation of balances and transactions. No method of transmission or storage is fully secure, and we cannot guarantee absolute security.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-white">7. Your rights</h2>
            <p className="mt-2">
              Depending on your jurisdiction, you may have rights to access, correct, or delete your personal data. To exercise these rights, email us at <a href="mailto:pulpsepackdrops@gmail.com" className="text-amber-300 underline">pulpsepackdrops@gmail.com</a> or through the Contact page.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-white">8. Children</h2>
            <p className="mt-2">
              The Service is not directed to anyone under 18, and we do not knowingly collect data from minors. If you believe a minor has registered, contact us and we will remove the account.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-white">9. Changes</h2>
            <p className="mt-2">We may update this policy from time to time and will post changes here.</p>
          </section>
        </div>
      </article>
    </PublicLayout>
  );
}