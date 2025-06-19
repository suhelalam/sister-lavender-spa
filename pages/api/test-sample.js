// pages/api/test-sample.js
export default async function handler(req, res) {
  res.status(200).json({
    success: true,
    data: [
      {
        id: 'QNCS25KLCNKHLT4AQYOLM4JU',
        name: 'Dazzle Dry Manicure',
        description: 'Long-lasting polish manicure',
        variations: [
          {
            id: 'VARIATION_1',
            name: 'Regular',
            price: 4500,
            currency: 'USD'
          },
          {
            id: 'VARIATION_2',
            name: 'Deluxe',
            price: 5500,
            currency: 'USD'
          }
        ]
      },
      {
        id: '7WCAIDVSRQ43UOH36CFKEFZF',
        name: 'Express Cupping Relief',
        description: 'Shoulder/back massage (5-8 mins) + essential oil cupping + warm towel finish.\n适合久坐肩颈紧张人群，快速舒缓。',
        variations: [
          {
            id: 'VARIATION_3',
            name: '30 Minute Session',
            price: 6500,
            currency: 'USD'
          }
        ]
      },
      {
        id: 'PJTJRWXEZZN7ITFRRP6D6XNH',
        name: 'Deep Tissue Massage',
        description: '60 minute deep tissue massage',
        variations: [
          {
            id: 'VARIATION_4',
            name: 'Standard',
            price: 8500,
            currency: 'USD'
          },
          {
            id: 'VARIATION_5',
            name: 'With Hot Stones',
            price: 9500,
            currency: 'USD'
          }
        ]
      },
      {
        id: 'CAZZHUITVYADU7E6XMQ4QUSC',
        name: 'Classic Full Body Massage',
        description: 'Gentle massage for full relaxation and circulation',
        variations: [
          {
            id: 'VARIATION_6',
            name: '60 Minutes',
            price: 8000,
            currency: 'USD'
          },
          {
            id: 'VARIATION_7',
            name: '90 Minutes',
            price: 11000,
            currency: 'USD'
          }
        ]
      }
    ]
  });
}