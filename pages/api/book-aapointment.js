import { Client, Environment } from 'square';

const client = new Client({
  environment: Environment.Sandbox, // switch to Production when ready
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { customer, serviceVariationId, startAt, locationId } = req.body;
  const { customersApi, appointmentsApi } = client;

  try {
    // 1. Create or search customer by email
    let customerId;

    // Try searching existing customer by email
    const searchRes = await customersApi.searchCustomers({
      query: {
        filter: { emailAddress: { exact: customer.emailAddress } }
      }
    });

    if (searchRes.result.customers?.length) {
      customerId = searchRes.result.customers[0].id;
    } else {
      // Create new customer
      const createRes = await customersApi.createCustomer(customer);
      customerId = createRes.result.customer.id;
    }

    // 2. Create appointment
    const appointmentRes = await appointmentsApi.createAppointment({
      appointment: {
        locationId,
        customerId,
        startAt,
        serviceVariationId,
      },
    });

    res.status(200).json({ appointment: appointmentRes.result.appointment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to book appointment' });
  }
}
