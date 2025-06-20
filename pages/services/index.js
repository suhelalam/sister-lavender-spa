// app/services/page.tsx (or /services/page.jsx)

import Image from 'next/image';

export default function Services() {
  const serviceCategories = [
    {
      title: '💆‍♀️ Head Spa Treatments',
      image: '/images/head.jpg',
      description: 'Experience deep scalp relaxation with a rejuvenating head spa that promotes hair health, relieves tension, and enhances overall well-being.',
      link: '/services/head-spa',
    },
    {
      title: '🧘‍♀️ Head & Body Harmony Rituals',
      image: '/images/massage.jpg',
      description: 'Indulge in a full-body sensory experience that combines head and body treatments to restore balance, ease stress, and elevate inner peace.',
      link: '/services/body-harmony',
    },
    {
      title: 'Body Massage Treatments',
      image: '/images/bodyMassage.jpg',
      description: 'Release tension and restore vitality with personalized body massages designed to relax muscles, improve circulation, and boost overall wellness.',
      link: '/services/body-massage',
    },
    {
      title: 'Foot care',
      image: '/images/footCare.jpg',
      description: 'Pamper your feet with expert care—callus removal, exfoliation, and deep hydration for comfort, softness, and refreshed soles.',
      link: '/services/foot-care',
    },
    {
      title: 'Manicure Services',
      image: '/images/manicure.jpg',
      description: 'Achieve elegant, healthy hands with precision nail shaping, cuticle care, and long-lasting polish in a relaxing, hygienic setting.',
      link: '/services/manicure',
    },
    // {
    //   title: 'Facial',
    //   image: '/images/facial.jpg',
    //   description: 'Rejuvenate your skin with gentle cleansing, nourishing masks, and expert pampering for a radiant glow.',
    //   link: '/services/body-massage',
    // },
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
