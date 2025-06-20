// app/services/page.tsx (or /services/page.jsx)

import Image from 'next/image';

export default function Services() {
  const serviceCategories = [
    {
      title: 'Head Spa Treatments',
      image: '/images/head.jpg',
      description: 'Revitalize your scalp with nourishing treatments.',
      link: '/services/scalp-treatments',
    },
    {
      title: 'Head & Body Harmony Rituals',
      image: '/images/massage.jpg',
      description: 'Relax and unwind with full-body massages.',
      link: '/services/body-massage',
    },
    {
      title: 'Body Massage Treatments',
      image: '/images/foot.jpg',
      description: 'Revitalize tired feet with expert callus removal and deep moisturizing treatments for softness and comfort.',
      link: '/services/body-massage',
    },
    {
      title: 'Foot care',
      image: '/images/foot.jpg',
      description: 'Revitalize tired feet with expert callus removal and deep moisturizing treatments for softness and comfort.',
      link: '/services/body-massage',
    },
    {
      title: 'Manicure Services',
      image: '/images/manicure.jpg',
      description: 'Enjoy beautifully shaped and polished nails with nourishing care for healthy, elegant hands.',
      link: '/services/body-massage',
    },
    {
      title: 'Facial',
      image: '/images/facial.jpg',
      description: 'Rejuvenate your skin with gentle cleansing, nourishing masks, and expert pampering for a radiant glow.',
      link: '/services/body-massage',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl sm:text-4xl font-bold mb-10 text-center">Our Services</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {serviceCategories.map(({ title, image, description, link }) => (
          <a
            key={title}
            href={link}
            target={link.startsWith('http') ? '_blank' : '_self'}
            rel={link.startsWith('http') ? 'noopener noreferrer' : undefined}
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
