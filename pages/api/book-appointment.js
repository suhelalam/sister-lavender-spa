import { SquareClient } from 'square';

const client = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
});
// testing
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { customer, serviceVariationId, startAt, locationId, serviceVariationVersion, } = req.body;

  console.log('🔍 Incoming request body:', req.body);

  try {
    // 1. Search or create customer
    let customerId;

    // console.log('🔍 Searching customer by email:', customer.emailAddress);

    const searchRes = await client.customers.search({
      query: {
        filter: {
          phoneNumber: {
            exact: customer.phoneNumber,
          },
          emailAddress: {
            exact: customer.emailAddress
          }
        },
      },
    });
    // console.log("raw res: ", searchRes);

    if (searchRes.customers?.length>0) {
      customerId = searchRes.customers[0].id;
      // console.log('✅ Found existing customer:', customerId);
      // console.log("service version: ", serviceVariationVersion);
    } else {
      // console.log('ℹ️ No existing customer found. Creating new one...');
      // console.log("Ceating cus: ", customer);
      const createRes = await client.customers.create(customer);
      // if (!createRes.result?.customer?.id) {
      //   throw new Error('Customer created but no ID returned from Square API');
      // }
      
      customerId = createRes.customer.id;
      // console.log('✅ Created new customer:', createRes.customer?.id);
    }

    // 2. Create appointment
    const appointmentPayload = {
      locationId,
      customerId,
      startAt,
      appointmentSegments: [
        {
          teamMemberId: "TMik65OJ7fLNHQvv",
          serviceVariationId,
          serviceVariationVersion: BigInt(serviceVariationVersion),
        },
      ],
    };

    // console.log('📦 Creating appointment with payload:', appointmentPayload);

    const appointmentRes = await client.bookings.create({ booking: appointmentPayload });

    // console.log('✅ Appointment created successfully:', appointmentRes);

    res.status(200).json({ appointment: appointmentRes.appointment });
  } catch (error) {
    // console.error('❌ Error during booking:', error);
    res.status(500).json({ error: error.message || 'Failed to book appointment' });
  }
}
