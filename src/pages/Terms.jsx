import React from "react";
import PublicLayout from "@/components/PublicLayout";

export default function Terms() {
  return (
    <PublicLayout>
      <article className="space-y-6">
        <h1 className="font-heading text-4xl font-bold text-white">Terms of Service</h1>
        <p className="text-xs text-zinc-500">Last updated: August 9, 2026</p>
        <div className="space-y-5 leading-relaxed text-zinc-300">
          <p>
            Welcome to PackPulseDrops ("we," "us," "our"). By creating an account or using the PackPulseDrops platform (the "Service"), you agree to these Terms of Service ("Terms"). If you do not agree, do not use the Service.
          </p>
          <section>
            <h2 className="font-heading text-xl font-bold text-white">1. Digital-only platform</h2>
            <p className="mt-2">
              PackPulseDrops is a digital collectibles platform. All cards, packs, and items available through the Service are <span className="font-semibold text-white">digital assets only</span>. We do not print, sell, mail, or ship any physical cards or merchandise. No physical goods will ever be delivered to you.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-white">2. Eligibility & age</h2>
            <p className="mt-2">
              You must be at least 18 years old (or the age of majority in your jurisdiction) to create an account, purchase gems, or request withdrawals. By registering, you represent that you meet this requirement and are legally able to enter into binding contracts.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-white">3. Accounts</h2>
            <p className="mt-2">
              You are responsible for keeping your account credentials secure and for all activity under your account. You agree to provide accurate information at registration and to update it as needed. We may suspend or terminate accounts that violate these Terms or that we believe are engaged in fraudulent or abusive activity.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-white">4. Gems, packs & purchases</h2>
            <p className="mt-2">
              Gems are a virtual currency used within the Service. You may purchase gems with real money or earn them through platform activity. Packs are opened instantly and their contents are revealed immediately; because the value of the contents is known at the moment of opening, <span className="font-semibold text-white">all pack and gem purchases are final and non-refundable</span>, except where required by law. Pull rates and rarity distributions are approximate and published per pack.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-white">5. Marketplace & peer-to-peer trading</h2>
            <p className="mt-2">
              You may list digital cards for sale to other users and purchase cards listed by others. A marketplace fee of 5% applies to sales; sellers receive 95% of the sale price in gems. You are responsible for the accuracy of your listings. We may remove listings that violate these Terms.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-white">6. Withdrawals & payouts</h2>
            <p className="mt-2">
              Gems earned from sales may be converted to cash and withdrawn to a connected bank account via Stripe, subject to verification and our approval. Withdrawal requests are reviewed and may be approved, rejected, or delayed based on fraud, risk, or compliance checks. We are not responsible for delays caused by your bank or payment processor.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-white">7. Prohibited conduct</h2>
            <p className="mt-2">You agree not to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Abuse free packs, referrals, or promotional rewards (including self-referral or multiple accounts).</li>
              <li>Use bots, scripts, or automated tools to manipulate pulls, the marketplace, or withdrawals.</li>
              <li>Sell or transfer your account, or attempt to circumvent withdrawal or verification controls.</li>
              <li>Engage in fraud, chargeback abuse, or money laundering.</li>
            </ul>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-white">8. Intellectual property</h2>
            <p className="mt-2">
              Card artwork and content generated on PackPulseDrops are provided for personal, non-commercial enjoyment within the Service. PackPulseDrops-branded assets, the platform interface, and generated content remain subject to our usage rules. Trademarks and likenesses of third-party properties referenced by category names are not owned by PackPulseDrops.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-white">9. Disclaimers & limitation of liability</h2>
            <p className="mt-2">
              The Service is provided "as is" without warranties of any kind. To the maximum extent permitted by law, PackPulseDrops shall not be liable for indirect, incidental, or consequential damages, or for any loss of virtual currency, cards, or data arising from your use of the Service. We do not guarantee that any digital card retains or increases in value.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-white">10. Changes</h2>
            <p className="mt-2">
              We may update these Terms from time to time. Continued use of the Service after changes are posted constitutes acceptance of the revised Terms.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-bold text-white">11. Contact</h2>
            <p className="mt-2">Questions about these Terms? Email us at <a href="mailto:pulpsepackdrops@gmail.com" className="text-amber-300 underline">pulpsepackdrops@gmail.com</a> or through the Contact page.</p>
          </section>
        </div>
      </article>
    </PublicLayout>
  );
}