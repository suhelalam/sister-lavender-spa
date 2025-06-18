import Link from 'next/link';

export default function ServiceCard({ title, description, image, link }) {
  return (
    <div className="bg-white shadow-lg rounded-xl overflow-hidden flex flex-col">
      <img
        src={image}
        alt={title}
        className="w-full h-48 object-cover"
      />
      <div className="p-4 flex flex-col flex-grow">
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        <p className="text-gray-600 flex-grow">{description}</p>
        <Link
          href={link}
          className="mt-4 inline-block text-center bg-purple-600 text-white py-2 px-4 rounded-full hover:bg-purple-700 transition"
        >
          Explore
        </Link>
      </div>
    </div>
  );
}
