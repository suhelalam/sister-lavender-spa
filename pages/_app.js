import '../styles/globals.css';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import SeoHead from '../components/SeoHead';
import { CartProvider } from '../context/CartContext';
import { ServicesProvider } from '../context/ServicesContext';
import { BookingProvider } from '../context/BookingContext';

const routeSeoMap = {
  '/': {
    title: 'Head Spa, Massage, and Nail Services in Chicago',
    description: 'Sister Lavender Spa in Chicago offers relaxing head spa treatments, therapeutic body massage, manicure services, and foot care near 2706 W Chicago Ave.',
    keywords: 'chicago spa, head spa chicago, massage chicago, manicure chicago, foot care chicago, wellness spa chicago, sister lavender spa, 2706 w chicago ave',
  },
  '/services': {
    title: 'Spa Services in Chicago',
    description: 'Browse all Sister Lavender Spa services in Chicago including head spa, massage therapy, cupping therapy, body harmony, manicure, and foot care treatments.',
    keywords: 'spa services chicago, chicago massage therapy, chicago head spa services, manicure chicago, cupping therapy chicago, foot care spa chicago',
  },
  '/services/head-spa': {
    title: 'Head Spa Services in Chicago',
    description: 'Book a professional head spa in Chicago at Sister Lavender Spa for scalp cleansing, stress relief, and a deeply relaxing hair and scalp treatment experience.',
    keywords: 'head spa chicago, scalp treatment chicago, scalp massage chicago, hair spa chicago, relaxing head spa',
  },
  '/services/body-massage': {
    title: 'Body Massage Services in Chicago',
    description: 'Experience therapeutic and relaxing body massage services in Chicago at Sister Lavender Spa, ideal for stress relief, tension release, and recovery.',
    keywords: 'body massage chicago, therapeutic massage chicago, relaxing massage chicago, deep relaxation massage',
  },
  '/services/body-harmony': {
    title: 'Body Harmony Treatments in Chicago',
    description: 'Restore balance with Body Harmony treatments at Sister Lavender Spa in Chicago, designed to support full-body relaxation and wellness.',
    keywords: 'body harmony chicago, wellness treatments chicago, relaxation therapy chicago, spa body treatment chicago',
  },
  '/services/cupping-therapy': {
    title: 'Cupping Therapy in Chicago',
    description: 'Try cupping therapy in Chicago at Sister Lavender Spa to support circulation, muscle recovery, and tension relief in a calm spa setting.',
    keywords: 'cupping therapy chicago, cupping massage chicago, muscle recovery therapy chicago, wellness cupping',
  },
  '/services/foot-care': {
    title: 'Foot Care Services in Chicago',
    description: 'Refresh tired feet with professional foot care services at Sister Lavender Spa in Chicago, including soothing treatment and self-care support.',
    keywords: 'foot care chicago, spa foot treatment chicago, foot spa chicago, pedicure spa chicago',
  },
  '/services/manicure': {
    title: 'Manicure Services in Chicago',
    description: 'Get clean, polished nails with professional manicure services at Sister Lavender Spa in Chicago, with attention to detail and comfort.',
    keywords: 'manicure chicago, nail spa chicago, nail care chicago, professional manicure chicago',
  },
  '/AllServices': {
    title: 'All Spa Services in Chicago',
    description: 'Explore the full menu of spa services at Sister Lavender Spa in Chicago and choose from head spa, massage, nail, and wellness treatments.',
    keywords: 'all spa services chicago, chicago wellness services, massage and head spa chicago, sister lavender services',
  },
  '/gift-card': {
    title: 'Spa Gift Cards in Chicago',
    description: 'Buy Sister Lavender Spa gift cards in Chicago for head spa, massage, manicure, and foot care services. Great for birthdays, holidays, and special occasions.',
    keywords: 'spa gift card chicago, massage gift card chicago, head spa gift card, wellness gift card chicago, sister lavender gift card',
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
    description: 'Book your Sister Lavender Spa appointment online for head spa, massage, manicure, and wellness treatments in Chicago.',
    keywords: 'book spa appointment chicago, online spa booking chicago, head spa booking, massage booking chicago',
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
          />
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </BookingProvider>
      </CartProvider>
    </ServicesProvider>
  );
}
