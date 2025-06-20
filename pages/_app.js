// pages/_app.js
import '../styles/globals.css';
import Layout from '../components/Layout';
import { CartProvider } from '../context/CartContext';
import { ServicesProvider } from '../context/ServicesContext';

export default function App({ Component, pageProps }) {
  const { initialServices = [] } = pageProps;

  return (
    <ServicesProvider initialServices={initialServices}>
      <CartProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </CartProvider>
    </ServicesProvider>
  );
}
