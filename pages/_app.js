// pages/_app.js
import '../styles/globals.css';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { CartProvider } from '../context/CartContext';
import { ServicesProvider } from '../context/ServicesContext';
import { BookingProvider } from '../context/BookingContext';

const routeTitleMap = {
  '/': 'Sister Lavender Spa',
  '/services': 'Services',
  '/booking': 'Booking',
  '/gift-card': 'Gift Card',
  '/location': 'Location',
  '/our-policy': 'Our Policy',
  '/service-agreement': 'Service Agreement',
  '/checkout': 'Checkout',
  '/confirmation': 'Confirmation',
  '/payment': 'Payment',
  '/login': 'Login',
};

const toTitleCase = (value = '') =>
  value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const buildPageTitle = (pathname = '/') => {
  if (routeTitleMap[pathname]) {
    return routeTitleMap[pathname];
  }

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return 'Sister Lavender Spa';
  }

  return segments.map(toTitleCase).join(' - ');
};

export default function App({ Component, pageProps }) {
  const { initialServices = [] } = pageProps;
  const router = useRouter();
  const pageTitle = buildPageTitle(router.pathname);
  const fullTitle = pageTitle === 'Sister Lavender Spa'
    ? pageTitle
    : `${pageTitle} | Sister Lavender Spa`;

  return (
    <ServicesProvider initialServices={initialServices}>
      <CartProvider>
        <BookingProvider>  {/* <-- wrap here */}
          <Head>
            <title>{fullTitle}</title>
            <link rel="icon" href="/favicon-96x96.png" />
          </Head>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </BookingProvider>
      </CartProvider>
    </ServicesProvider>
  );
}
