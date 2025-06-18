import '../styles/globals.css'
import Layout from '../components/Layout';
import { CartProvider } from '../context/CartContext';

export default function App({ Component, pageProps }) {
  return (
    <CartProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
    </CartProvider>
    
  );
}
