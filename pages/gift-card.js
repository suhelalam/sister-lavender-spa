import { useEffect } from 'react';
import Link from 'next/link';
import SeoHead from '../components/SeoHead';

const PAGE_TITLE = 'Spa Gift Cards in Chicago for Massage, Head Spa & Nails';
const PAGE_DESCRIPTION = 'Buy a Sister Lavender Spa gift card in Chicago for head spa, massage, side-by-side services, manicures, pedicures, and foot care. A thoughtful wellness gift for any occasion.';
const PAGE_KEYWORDS = 'spa gift cards chicago, massage gift card chicago, head spa gift card chicago, manicure gift card chicago, pedicure gift card chicago, wellness gifts chicago, sister lavender spa gift card';
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
        '@type': 'DaySpa',
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
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL || undefined },
        { '@type': 'ListItem', position: 2, name: 'Spa Gift Cards', item: PAGE_URL || undefined },
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What can Sister Lavender Spa gift cards be used for?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Gift cards can be used toward eligible head spa, massage, side-by-side, manicure, pedicure, and foot care services at Sister Lavender Spa in Chicago.',
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
        image="/images/facial.jpg"
        structuredData={structuredData}
        structuredDataKey="gift-card-json-ld"
      />

      <main>
        <header className="bg-[#f0ebe4] px-4 py-14 text-center sm:py-20">
          <p className="eyebrow">Give rest, care, and time</p>
          <h1 className="mx-auto mt-3 max-w-4xl font-display text-4xl leading-tight text-[#423846] sm:text-6xl">Spa gift cards in Chicago</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-stone-600">Give someone a relaxing experience at Sister Lavender Spa. Gift cards can be used toward eligible head spa, massage, side-by-side, manicure, pedicure, and foot care services.</p>
          <p className="mx-auto mt-3 max-w-2xl text-stone-600">A thoughtful self-care gift for birthdays, holidays, thank-yous, celebrations, or simply because.</p>
        </header>

        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">

        <section className="mb-12 rounded-2xl border border-[#e3dad1] bg-white p-5 shadow-[0_14px_40px_rgba(65,49,43,0.1)] sm:p-8" aria-labelledby="gift-card-checkout-heading">
          <p className="eyebrow">Purchase online</p><h2 id="gift-card-checkout-heading" className="mb-6 mt-2 font-display text-3xl text-[#423846]">Choose your gift card</h2>
          <div
            className="gift-up-target"
            data-site-id="df249f17-d97c-4f28-a7e1-08de347f3724"
            data-platform="Other"
          ></div>
          <noscript>
            JavaScript is required to buy a gift card online. Please call (312) 900-3131 for assistance.
          </noscript>
        </section>

        <section className="grid gap-5 sm:grid-cols-3" aria-label="Why give a Sister Lavender Spa gift card">
          {[['A flexible spa gift','Let the recipient choose the eligible treatment that feels right for them.'],['Experiences for every guest','Choose individual care or a side-by-side visit with a friend, relative, partner, or any guest.'],['A local Chicago spa','Redeem eligible gift cards at Sister Lavender Spa in West Town, Chicago.']].map(([title,text])=><article key={title} className="rounded-2xl bg-[#f4eff5] p-5"><h2 className="font-display text-xl text-[#423846]">{title}</h2><p className="mt-3 text-sm leading-6 text-stone-600">{text}</p></article>)}
        </section>

        <section className="mt-14 space-y-5" aria-label="Frequently asked questions">
          <p className="eyebrow">Helpful details</p><h2 className="font-display text-3xl text-[#423846]">Spa gift card FAQ</h2>
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-stone-900">What can Sister Lavender Spa gift cards be used for?</h3>
            <p className="mt-2 leading-7 text-stone-600">Gift cards can be used toward eligible head spa, massage, side-by-side, manicure, pedicure, and foot care services.</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-stone-900">Do gift cards expire?</h3>
            <p className="mt-2 leading-7 text-stone-600">Any expiration and redemption terms are displayed during checkout before purchase.</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-stone-900">Where is Sister Lavender Spa located?</h3>
            <p className="mt-2 leading-7 text-stone-600">2706 W Chicago Ave, Chicago, IL 60622. <Link href="/location" className="font-semibold text-[#66516f] underline underline-offset-4">View location and hours</Link>.</p>
          </div>
        </section>
        <section className="mt-12 rounded-2xl bg-[#66516f] p-7 text-white sm:flex sm:items-center sm:justify-between sm:gap-6"><div><h2 className="font-display text-3xl">Need help choosing?</h2><p className="mt-2 text-sm leading-6 text-white/80">Browse current services and pricing, or call us before purchasing.</p></div><div className="mt-5 flex flex-wrap gap-3 sm:mt-0"><Link href="/services" className="button-light">Browse services</Link><a href="tel:+13129003131" className="button-ghost-light">Call (312) 900-3131</a></div></section>
        </div>
      </main>
    </>
  );
}
