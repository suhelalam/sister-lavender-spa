import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
      <h1 className="text-4xl font-bold mb-4">Welcome to Sister Lavender Spa</h1>
      <p className="text-lg">Relax. Rejuvenate. Refresh.</p>
      <div className="mt-6 space-x-4">
        <Link
          href="/booking"
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Book Appointment
        </Link>
        <Link
          href="/service-agreement"
          className="px-4 py-2 border border-purple-600 text-purple-600 rounded hover:bg-purple-100"
        >
          Service Agreement
        </Link>
      </div>
    </div>
  );
}
