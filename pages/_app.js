import '../styles/globals.css';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import SeoHead from '../components/SeoHead';
import { CartProvider } from '../context/CartContext';
import { ServicesProvider } from '../context/ServicesContext';
import { BookingProvider } from '../context/BookingContext';

const routeSeoMap = {
  '/': {
    title: 'Head Spa, Massage, Side-by-Side & Nails in Chicago',
    description: 'Sister Lavender Spa offers head spa, massage, side-by-side services for any two guests, manicures, pedicures, and foot care at 2706 W Chicago Ave, Chicago, IL 60622.',
    keywords: 'chicago spa, head spa chicago, massage chicago, side by side spa chicago, manicure chicago, pedicure chicago, sister lavender spa',
    image: '/images/Firefly_Full-body spa ritual scene combining head and body massage. A tranquil environment wi 864039.jpg',
  },
  '/services': {
    title: 'Spa Services & Pricing in Chicago',
    description: 'Explore current pricing at Sister Lavender Spa in Chicago for head spa, massage, manicures, pedicures, foot care, and side-by-side services for any two guests.',
    keywords: 'spa services and pricing chicago, chicago spa prices, head spa pricing chicago, massage prices chicago, manicure chicago, side by side spa chicago',
    image: '/images/head.jpg',
  },
  '/services/head-spa': {
    title: 'Head Spa Services in Chicago',
    description: 'Book a professional head spa in Chicago at Sister Lavender Spa for scalp cleansing, stress relief, and a deeply relaxing hair and scalp treatment experience.',
    keywords: 'head spa chicago, scalp treatment chicago, scalp massage chicago, hair spa chicago, relaxing head spa',
    image: '/images/head.jpg',
  },
  '/services/body-massage': {
    title: 'Body Massage Services in Chicago',
    description: 'Experience therapeutic and relaxing body massage services in Chicago at Sister Lavender Spa, ideal for stress relief, tension release, and recovery.',
    keywords: 'body massage chicago, therapeutic massage chicago, relaxing massage chicago, deep relaxation massage',
    image: '/images/bodyMassage.jpg',
  },
  '/services/body-harmony': {
    title: 'Body Harmony Treatments in Chicago',
    description: 'Restore balance with Body Harmony treatments at Sister Lavender Spa in Chicago, designed to support full-body relaxation and wellness.',
    keywords: 'body harmony chicago, wellness treatments chicago, relaxation therapy chicago, spa body treatment chicago',
    noIndex: true,
  },
  '/services/cupping-therapy': {
    title: 'Cupping Therapy in Chicago',
    description: 'Try cupping therapy in Chicago at Sister Lavender Spa to support circulation, muscle recovery, and tension relief in a calm spa setting.',
    keywords: 'cupping therapy chicago, cupping massage chicago, muscle recovery therapy chicago, wellness cupping',
    noIndex: true,
  },
  '/services/foot-care': {
    title: 'Pedicure & Foot Care Services in Chicago',
    description: 'Browse pedicure and restorative foot care services with current pricing at Sister Lavender Spa in Chicago, including exfoliation and hydrating care.',
    keywords: 'foot care chicago, spa foot treatment chicago, foot spa chicago, pedicure spa chicago',
    image: '/images/footCare.jpg',
  },
  '/services/manicure': {
    title: 'Manicure Services in Chicago',
    description: 'Get clean, polished nails with professional manicure services at Sister Lavender Spa in Chicago, with attention to detail and comfort.',
    keywords: 'manicure chicago, nail spa chicago, nail care chicago, professional manicure chicago',
    image: '/images/manicure.jpg',
  },
  '/services/best-sellers': {
    title: 'Best-Selling Spa Services in Chicago',
    description: 'Explore the head spa, massage, manicure, pedicure, foot care, and side-by-side treatments most frequently booked at Sister Lavender Spa in Chicago.',
    keywords: 'best spa services chicago, popular head spa chicago, most booked massage chicago, sister lavender best sellers',
  },
  '/AllServices': {
    title: 'All Spa Services in Chicago',
    description: 'Explore the full menu of spa services at Sister Lavender Spa in Chicago and choose from head spa, massage, nail, and wellness treatments.',
    keywords: 'all spa services chicago, chicago wellness services, massage and head spa chicago, sister lavender services',
    noIndex: true,
  },
  '/gift-card': {
    title: 'Spa Gift Cards in Chicago for Massage, Head Spa & Nails',
    description: 'Buy a Sister Lavender Spa gift card in Chicago for head spa, massage, side-by-side services, manicures, pedicures, and foot care. A thoughtful wellness gift for any occasion.',
    keywords: 'spa gift cards chicago, massage gift card chicago, head spa gift card chicago, manicure gift card chicago, pedicure gift card chicago, wellness gifts chicago, sister lavender spa gift card',
    image: '/images/facial.jpg',
  },
  '/location': {
    title: 'Spa Location in Chicago',
    description: 'Visit Sister Lavender Spa at 2706 W Chicago Ave, Chicago, IL 60622. Find our location, contact details, and plan your spa visit.',
    keywords: 'sister lavender spa location, chicago spa near me, spa wicker park chicago, 2706 w chicago ave spa, chicago wellness spa address',
  },
  '/our-policy': {
    title: 'Spa Policies',
    description: 'Read Sister Lavender Spa policies for appointments, arrivals, cancellations, and service expectations before your visit.',
    keywords: 'spa policy, cancellation policy spa, appointment policy chicago spa, sister lavender policy',
  },
  '/service-agreement': {
    title: 'Service Agreement',
    description: 'Review the Sister Lavender Spa service agreement and important care details before confirming your appointment in Chicago.',
    keywords: 'spa service agreement, appointment terms spa, chicago spa agreement, client consent spa',
  },
  '/booking': {
    title: 'Book a Spa Appointment in Chicago',
    description: 'Book a head spa, massage, manicure, pedicure, foot care, or side-by-side appointment online at Sister Lavender Spa in Chicago.',
    keywords: 'book spa appointment chicago, online spa booking chicago, head spa booking, massage booking chicago, manicure appointment chicago',
  },
  '/couples-services': {
    title: 'Side-by-Side Spa Services in Chicago',
    description: 'Book side-by-side head spa and massage experiences in Chicago with a friend, family member, partner, or any guest. These shared services are for everyone.',
    keywords: 'side by side spa chicago, spa day with friends chicago, mother daughter spa chicago, couples massage chicago, shared head spa chicago',
    image: '/images/Firefly_Full-body spa ritual scene combining head and body massage. A tranquil environment wi 34456.jpg',
  },
  '/membership-rewards': {
    title: 'Lavender Spa Rewards',
    description: 'Learn how Lavender Rewards members earn points on eligible spa services and redeem rewards at Sister Lavender Spa in Chicago.',
    keywords: 'spa rewards chicago, massage rewards program, head spa loyalty program, lavender rewards',
  },
  '/about': {
    title: 'About Sister Lavender Spa in Chicago',
    description: 'Learn about Sister Lavender Spa and our thoughtful approach to head spa, massage, nail care, side-by-side treatments, and wellness in West Town Chicago.',
    keywords: 'about sister lavender spa, west town chicago spa, chicago wellness spa',
  },
  '/group-events': {
    title: 'Spa Group Events in Chicago',
    description: 'Plan a relaxing spa group event in Chicago for birthdays, bridal celebrations, friends, teams, and other special occasions.',
    keywords: 'spa party chicago, group spa chicago, bridal spa day chicago, birthday spa event',
  },
  '/check-in': {
    title: 'Guest Appointment Check-In',
    description: 'Secure in-spa appointment and walk-in check-in for Sister Lavender Spa guests.',
    noIndex: true,
  },
  '/group-events/confirm': {
    title: 'Confirm Group Event',
    description: 'Private confirmation page for Sister Lavender Spa group-event requests.',
    noIndex: true,
  },
  '/group-events/manage': {
    title: 'Manage Group Event',
    description: 'Private management page for Sister Lavender Spa group-event requests.',
    noIndex: true,
  },
  '/select-time': {
    title: 'Select Appointment Time',
    description: 'Select your preferred appointment date and time for Sister Lavender Spa services in Chicago.',
    keywords: 'spa appointment time selection, schedule spa chicago, choose booking time',
    noIndex: true,
  },
  '/checkout': {
    title: 'Appointment Checkout',
    description: 'Review booking details and complete your secure appointment checkout for Sister Lavender Spa.',
    keywords: 'spa checkout, appointment checkout, secure booking payment',
    noIndex: true,
  },
  '/payment': {
    title: 'Payment',
    description: 'Secure payment page for Sister Lavender Spa bookings in Chicago.',
    keywords: 'secure spa payment, booking payment page, chicago spa payment',
    noIndex: true,
  },
  '/confirmation': {
    title: 'Booking Confirmation',
    description: 'View your Sister Lavender Spa booking confirmation and appointment details.',
    keywords: 'spa booking confirmation, appointment confirmed chicago spa',
    noIndex: true,
  },
  '/cancel-booking': {
    title: 'Cancel Booking',
    description: 'Cancel or update your Sister Lavender Spa appointment with the online booking management page.',
    keywords: 'cancel spa booking, reschedule spa appointment, chicago spa cancellation',
    noIndex: true,
  },
  '/customer': {
    title: 'Customer Details',
    description: 'Enter customer information required to continue with your Sister Lavender Spa booking.',
    keywords: 'spa customer details, booking customer information, appointment form',
    noIndex: true,
  },
  '/login': {
    title: 'Admin Login',
    description: 'Secure admin login for Sister Lavender Spa management access.',
    keywords: 'spa admin login, internal login page, sister lavender admin',
    noIndex: true,
  },
  '/terminal': {
    title: 'Terminal Checkout',
    description: 'In-store terminal checkout page used by staff at Sister Lavender Spa.',
    keywords: 'spa terminal checkout, in store payment terminal',
    noIndex: true,
  },
  '/Cbooking': {
    title: 'Booking',
    description: 'Internal booking workflow page for Sister Lavender Spa.',
    keywords: 'internal booking page',
    noIndex: true,
  },
  '/CheckInPage': {
    title: 'Check-In',
    description: 'Appointment check-in page for Sister Lavender Spa customers.',
    keywords: 'spa appointment check in',
    noIndex: true,
  },
  '/ConfirmBookingPage': {
    title: 'Confirm Booking',
    description: 'Confirm final booking details before submitting your Sister Lavender Spa appointment.',
    keywords: 'confirm spa booking, appointment confirmation step',
    noIndex: true,
  },
  '/admin': {
    title: 'Admin Dashboard',
    description: 'Sister Lavender Spa admin dashboard for operations and management.',
    keywords: 'spa admin dashboard, internal operations',
    noIndex: true,
  },
  '/admin/analytics': {
    title: 'Admin Analytics',
    description: 'Internal analytics dashboard for tracking Sister Lavender Spa performance and bookings.',
    keywords: 'spa analytics admin, booking analytics internal',
    noIndex: true,
  },
  '/admin/checkins': {
    title: 'Admin Check-Ins',
    description: 'Internal page to manage and review customer check-ins at Sister Lavender Spa.',
    keywords: 'spa check ins admin, internal checkin management',
    noIndex: true,
  },
  '/admin/customers': {
    title: 'Admin Customers',
    description: 'Internal Sister Lavender Spa customer relationship management page.',
    noIndex: true,
  },
  '/admin/receipts': {
    title: 'Admin Receipts',
    description: 'Internal receipts and payment records management for Sister Lavender Spa.',
    keywords: 'spa receipts admin, payment records internal',
    noIndex: true,
  },
  '/admin/services': {
    title: 'Admin Services',
    description: 'Internal service catalog and add-on management page for Sister Lavender Spa.',
    keywords: 'spa service management admin, internal service catalog',
    noIndex: true,
  },
  '/admin/settings': {
    title: 'Admin Settings',
    description: 'Internal settings page for announcements and business configuration at Sister Lavender Spa.',
    keywords: 'spa admin settings, internal configuration page',
    noIndex: true,
  },
  '/404': {
    title: 'Page Not Found',
    description: 'The requested Sister Lavender Spa page could not be found.',
    noIndex: true,
  },
};

const toTitleCase = (value = '') =>
  value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const buildPageTitle = (pathname = '/') => {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return 'Sister Lavender Spa';
  }

  return segments.map(toTitleCase).join(' - ');
};

export default function App({ Component, pageProps }) {
  const { initialServices = [] } = pageProps;
  const router = useRouter();
  const routeSeo = routeSeoMap[router.pathname] || {};
  const pageTitle = routeSeo.title || buildPageTitle(router.pathname);
  const isAdminRoute = router.pathname.startsWith('/admin');
  const noIndex = typeof routeSeo.noIndex === 'boolean' ? routeSeo.noIndex : isAdminRoute;
  const siteUrl = String(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
  const structuredData = noIndex ? undefined : [
    {
      '@context': 'https://schema.org',
      '@type': 'DaySpa',
      '@id': siteUrl ? `${siteUrl}/#spa` : undefined,
      name: 'Sister Lavender Spa',
      url: siteUrl || undefined,
      image: siteUrl ? `${siteUrl}/images/head.jpg` : undefined,
      telephone: '+1-312-900-3131',
      email: 'selena@sisterlavenderspa.com',
      priceRange: '$$',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '2706 W Chicago Ave',
        addressLocality: 'Chicago',
        addressRegion: 'IL',
        postalCode: '60622',
        addressCountry: 'US',
      },
      areaServed: 'Chicago, Illinois',
      openingHoursSpecification: [{
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
        opens: '09:30',
        closes: '21:00',
      }],
      sameAs: ['https://www.instagram.com/sisterlavenderspa/'],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: pageTitle,
      description: routeSeo.description,
      url: siteUrl ? `${siteUrl}${router.asPath.split(/[?#]/)[0]}` : undefined,
      isPartOf: siteUrl ? { '@type': 'WebSite', name: 'Sister Lavender Spa', url: siteUrl } : undefined,
    },
  ];

  return (
    <ServicesProvider initialServices={initialServices}>
      <CartProvider>
        <BookingProvider>
          <SeoHead
            title={pageTitle}
            description={routeSeo.description}
            keywords={routeSeo.keywords}
            path={router.asPath}
            noIndex={noIndex}
            image={routeSeo.image}
            structuredData={structuredData}
          />
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </BookingProvider>
      </CartProvider>
    </ServicesProvider>
  );
}
