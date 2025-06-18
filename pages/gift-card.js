export default function GiftCard() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-center">
      <h1 className="text-4xl font-bold text-purple-700 mb-6">Give the Gift of Relaxation</h1>
      <p className="text-gray-700 text-lg mb-4">
        Whether it's a birthday, anniversary, or just because — treat your loved ones to a moment of peace and pampering.
      </p>
      <p className="text-gray-700 text-lg mb-8">
        Our gift cards can be used for any of our spa services and are the perfect way to show you care.
      </p>
      <a
        href="https://app.squareup.com/gift/MLANN7A68QX2Y/order"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block bg-purple-600 text-white text-lg font-medium px-8 py-3 rounded-lg shadow-md hover:bg-purple-700 transition"
      >
        Buy Gift Card Now
      </a>
    </main>
  );
}
