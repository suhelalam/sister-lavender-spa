import { SquareClient, SquareEnvironment } from 'square';

const client = new SquareClient({
  environment: SquareEnvironment.Production,
  token: process.env.SQUARE_ACCESS_TOKEN,
});

function stringifyBigInts(obj) {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}

// Convert Chicago date + time string (e.g. '2025-06-30', '00:00:00') to UTC ISO string
function chicagoDateToUtcIso(dateString, timeString) {
  const chicagoDateTime = new Date(`${dateString}T${timeString}`);
  // Add 6 hours to get UTC time (Chicago is UTC-6)
  const utcDate = new Date(chicagoDateTime.getTime() + 6 * 60 * 60 * 1000);
  return utcDate.toISOString();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { serviceVariationId, startDate } = req.body;

  try {
    const startAtUtc = chicagoDateToUtcIso(startDate, '00:00:00');
    const endAtUtc = chicagoDateToUtcIso(startDate, '23:59:59');

    const availRes = await client.bookings.searchAvailability({
      query: {
        filter: {
          locationId: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID,
          segmentFilters: [{ serviceVariationId }],
          startAtRange: {
            startAt: startAtUtc,
            endAt: endAtUtc,
          },
        },
      },
    });

    // console.log('Square response:', availRes);

    res.status(200).json({
      success: true,
      availabilities: stringifyBigInts(availRes?.availabilities ?? []),
    });
  } catch (error) {
    console.error('Availability Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
