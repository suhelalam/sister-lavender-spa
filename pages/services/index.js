import ServiceCard from '../../components/ServiceCard';

export default function Services() {
  const serviceCategories = [
    {
      title: 'Scalp Treatments',
      image: '/images/head.jpg',
      description: 'Revitalize your scalp with nourishing treatments.',
      link: '/services/scalp-treatments',
    },
    {
      title: 'Body Massage',
      image: '/images/massage.jpg',
      description: 'Relax and unwind with full-body massages.',
      link: '/services/body-massage',
    },
    {
      title: 'Foot Care',
      image: '/images/foot.jpg',
      description: 'Revitalize tired feet with expert callus removal and deep moisturizing treatments for softness and comfort.',
      link: '/services/body-massage',
    },
    {
      title: 'Manicure',
      image: '/images/manicure.jpg',
      description: 'Enjoy beautifully shaped and polished nails with nourishing care for healthy, elegant hands.',
      link: '/services/body-massage',
    },
    {
      title: 'Pedicure',
      image: '/images/massage.jpg',
      description: 'Pamper your feet with precise callus removal and luxurious moisturizing for smooth, refreshed skin.',
      link: '/services/body-massage',
    },
    {
      title: 'Facial',
      image: '/images/facial.jpg',
      description: 'Rejuvenate your skin with gentle cleansing, nourishing masks, and expert pampering for a radiant glow.',
      link: '/services/body-massage',
    },
    // Add more categories
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-8 text-center">Our Services</h1>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {serviceCategories.map((category) => (
          <ServiceCard key={category.title} {...category} />
        ))}
      </div>
    </div>
  );
}
