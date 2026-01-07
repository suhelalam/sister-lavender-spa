import Image from 'next/image';
import { serviceCategories } from '../../lib/servicesData'; // or your path

export default function Services() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl sm:text-4xl font-bold mb-10 text-center">Our Services</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {serviceCategories.map(({ title, image, description, link, slug }) => (
          <a
            key={slug}
            href={link}
            className="block border rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition bg-white"
          >
            <div className="relative w-full h-48 sm:h-56 md:h-60 lg:h-64">
              <Image
                src={image}
                alt={title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                priority
              />
            </div>
            <div className="p-4">
              <h2 className="text-lg sm:text-xl font-semibold mb-2">{title}</h2>
              <p className="text-gray-700 text-sm sm:text-base">{description}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}