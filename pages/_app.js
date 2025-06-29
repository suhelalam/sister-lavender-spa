// pages/_app.js
import '../styles/globals.css';
import Layout from '../components/Layout';
import { CartProvider } from '../context/CartContext';
import { ServicesProvider } from '../context/ServicesContext';
import { BookingProvider } from '../context/BookingContext';

export default function App({ Component, pageProps }) {
  const { initialServices = [] } = pageProps;

  return (
    <ServicesProvider initialServices={initialServices}>
      <CartProvider>
        <BookingProvider>  {/* <-- wrap here */}
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </BookingProvider>
      </CartProvider>
    </ServicesProvider>
  );
}
