import { useEffect } from 'react';
import Link from 'next/link';
import SeoHead from '../components/SeoHead';

const PAGE_TITLE = 'Spa Gift Cards in Chicago';
const PAGE_DESCRIPTION = 'Buy Sister Lavender Spa gift cards for head spa, massage, and nail services in Chicago. Send a thoughtful wellness gift for birthdays, holidays, and special occasions.';
const PAGE_KEYWORDS = 'spa gift card chicago, massage gift card chicago, head spa gift card, manicure gift card chicago, wellness gift card chicago, self care gift chicago, sister lavender spa gift card';
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '';
const PAGE_URL = SITE_URL ? `${SITE_URL.replace(/\/$/, '')}/gift-card` : '';

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      name: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      url: PAGE_URL || undefined,
      isPartOf: SITE_URL
        ? {
            '@type': 'WebSite',
            name: 'Sister Lavender Spa',
            url: SITE_URL,
          }
        : undefined,
      about: {
        '@type': 'LocalBusiness',
        name: 'Sister Lavender Spa',
        telephone: '+1-312-900-3131',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '2706 W Chicago Ave',
          addressLocality: 'Chicago',
          addressRegion: 'IL',
          postalCode: '60622',
          addressCountry: 'US',
        },
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What can Sister Lavender Spa gift cards be used for?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Gift cards can be used toward our head spa, massage, and nail services at Sister Lavender Spa in Chicago.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do gift cards expire?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Gift card terms and expiration details are shown at checkout before purchase.',
          },
        },
        {
          '@type': 'Question',
          name: 'Where is Sister Lavender Spa located?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sister Lavender Spa is located at 2706 W Chicago Ave, Chicago, IL 60622.',
          },
        },
      ],
    },
  ],
};

export default function GiftCard() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.giftup.app/dist/gift-up.js';
    script.async = true;

    script.onload = () => {
      if (window.giftup) {
        window.giftup();
      }
    };

    document.head.appendChild(script);

    return () => {
      const existingScript = document.querySelector('script[src="https://cdn.giftup.app/dist/gift-up.js"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return (
    <>
      <SeoHead
        title={PAGE_TITLE}
        description={PAGE_DESCRIPTION}
        keywords={PAGE_KEYWORDS}
        path="/gift-card"
        structuredData={structuredData}
        structuredDataKey="gift-card-json-ld"
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-purple-700 mb-6">Buy a Spa Gift Card in Chicago</h1>
          <p className="text-gray-700 text-lg mb-4">
            Give someone a relaxing experience at Sister Lavender Spa. Our gift cards can be used for head spa,
            massage, and nail services.
          </p>
          <p className="text-gray-700 text-lg mb-8">
            Perfect for birthdays, anniversaries, holidays, and thank-you gifts.
          </p>
        </div>

        <section className="bg-white rounded-xl shadow-lg p-6 mb-10" aria-label="Gift card checkout">
          <div
            className="gift-up-target"
            data-site-id="df249f17-d97c-4f28-a7e1-08de347f3724"
            data-platform="Other"
          ></div>
          <noscript>
            JavaScript is required to buy a gift card online. Please call (312) 900-3131 for assistance.
          </noscript>
        </section>

        <section className="space-y-6" aria-label="Gift card information">
          <h2 className="text-2xl font-semibold text-purple-800">Gift Card Details</h2>
          <p className="text-gray-700">
            Sister Lavender Spa gift cards are a convenient way to treat someone to self-care in Chicago.
          </p>
          <p className="text-gray-700">
            Questions before purchasing? Call <a href="tel:+13129003131" className="text-purple-700 underline">(312) 900-3131</a> or visit us at 2706 W Chicago Ave, Chicago, IL 60622.
          </p>
          <p className="text-gray-700">
            Looking for services first? <Link href="/services" className="text-purple-700 underline">Browse our spa services</Link>.
          </p>
        </section>

        <section className="mt-10 space-y-4" aria-label="Frequently asked questions">
          <h2 className="text-2xl font-semibold text-purple-800">Gift Card FAQ</h2>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">What can gift cards be used for?</h3>
            <p className="text-gray-700">Gift cards can be used toward eligible head spa, massage, and nail services.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Do gift cards expire?</h3>
            <p className="text-gray-700">Any expiration and redemption terms are displayed during checkout before purchase.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Where are you located?</h3>
            <p className="text-gray-700">2706 W Chicago Ave, Chicago, IL 60622.</p>
          </div>
        </section>
      </main>
    </>
  );
}
