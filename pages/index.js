import Link from 'next/link';
import Head from 'next/head';
import { ServicesProvider, useServices } from '../context/ServicesContext';
import ServiceCard from '../components/ServiceCard';
import { getInitialServices } from '../lib/fetchServices';

export async function getServerSideProps() {
  const initialServices = await getInitialServices();
  return {props: {initialServices}};
}

function HomeContent() {
  const { services } = useServices();
  console.log('Services in context:', services);

  const featuredServices = services.slice(0, 4); // or however you want
  const announcements = [
    {
      id: 1,
      title: '🌸 New Customer Offer',
      date: 'June 20, 2025',
      description: 'Enjoy 20% off all services booked this month during our soft opening.',
    },
    {
      id: 2,
      title: '✨ Self-Care is Better Together',
      date: 'June 10, 2025',
      description: 'Bring in a friend or loved one and enjoy 25% off for both.',
    },
  ];

  return (
    <>
      <Head>
        <title>Sister Lavender Spa</title>
        <link rel="icon" href="/favicon-96x96.png" />
      </Head>

      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-purple-50">
        {/* Logo */}
        <img
          src="/logo.png"
          alt="Sister Lavender Spa Logo"
          className="mb-6 w-32 h-auto"
        />

        <h1 className="text-5xl font-bold mb-4 text-purple-700">
          Welcome to Sister Lavender Spa
        </h1>
        <p className="text-lg text-gray-700 mb-6 max-w-xl">
          A peaceful sanctuary where beauty meets wellness...
        </p>

        <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0 mb-8">
          <Link href="/AllServices" className="px-6 py-3 bg-purple-600 text-white rounded hover:bg-purple-700 transition">Book Appointment</Link>
          <Link href="/service-agreement" className="px-6 py-3 border border-purple-600 text-purple-600 rounded hover:bg-purple-100 transition">Service Agreement</Link>
          <Link href="/gift-card" className="px-6 py-3 border border-yellow-500 text-yellow-700 rounded hover:bg-yellow-100 transition">Buy Gift Card</Link>
        </div>

        <div className="text-left max-w-2xl space-y-6">
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-purple-800 mb-4">📰 Latest News & Announcements</h2>
            <ul className="space-y-6">
              {announcements.map(({ id, title, date, description }) => (
                <li key={id} className="border border-purple-300 rounded p-4 bg-white shadow-sm">
                  <h3 className="text-xl font-bold text-purple-700">{title}</h3>
                  <p className="text-sm text-gray-500 mb-2">{date}</p>
                  <p>{description}</p>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-2xl font-semibold text-purple-800 mb-2">
              🌟 Featured Services
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {featuredServices.map((service) => (
                <ServiceCard key={service._id} service={service} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-purple-800 mb-2">🌿 Our Services</h2>
            <p className="text-gray-700">From massages to scalp therapy...</p>
            <Link href="/AllServices" className="text-purple-600 underline hover:text-purple-800 inline-block mt-2">Explore all services →</Link>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-purple-800 mb-2">🎁 Gift the Experience</h2>
            <p className="text-gray-700">Our gift cards let your loved ones choose their moment of relaxation.</p>
            <Link href="/gift-card" className="text-purple-600 underline hover:text-purple-800 inline-block mt-2">Learn more →</Link>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-purple-800 mb-2">📍 Visit Us</h2>
            <p className="text-gray-700">2706 W Chicago Ave, Chicago, IL 60622</p>
          </section>
        </div>
      </div>
    </>
  );
}

export default function Home({initialServices}) {
  return (
    <ServicesProvider initialServices={initialServices}>
      <HomeContent />
    </ServicesProvider>
    
  );
}
