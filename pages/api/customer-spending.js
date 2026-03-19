import { db } from '../../lib/firebase';
import { query, where, getDocs, collection } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email, stripeCustomerId } = req.query;

    if (!email && !stripeCustomerId) {
      return res.status(400).json({ error: 'Email or stripeCustomerId parameter required' });
    }

    const normalizedEmail = email ? email.toLowerCase() : null;

    // Get customer spending summary
    let spendingQuery = null;
    if (stripeCustomerId) {
      spendingQuery = query(
        collection(db, 'customerSpending'),
        where('stripeCustomerId', '==', stripeCustomerId)
      );
    } else if (normalizedEmail) {
      spendingQuery = query(
        collection(db, 'customerSpending'),
        where('email', '==', normalizedEmail)
      );
    }

    const spendingSnapshots = await getDocs(spendingQuery);

    if (spendingSnapshots.empty) {
      return res.status(404).json({ error: 'Customer not found in spending records' });
    }

    const customerSpending = spendingSnapshots.docs[0].data();
    const customerId = customerSpending.stripeCustomerId || customerSpending.email;

    // Get all cash payments for this customer
    const paymentsQuery = stripeCustomerId
      ? query(collection(db, 'cashPayments'), where('stripeCustomerId', '==', stripeCustomerId))
      : query(collection(db, 'cashPayments'), where('customerEmail', '==', normalizedEmail));

    const paymentSnapshots = await getDocs(paymentsQuery);
    const payments = paymentSnapshots.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get all card payments from bookingAnalytics
    const bookingsQuery = normalizedEmail
      ? query(collection(db, 'bookingAnalytics'), where('customerEmail', '==', normalizedEmail))
      : query(collection(db, 'bookingAnalytics'), where('squareCustomerId', '==', stripeCustomerId));

    const bookingSnapshots = await getDocs(bookingsQuery);
    const bookings = bookingSnapshots.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({
      ok: true,
      customer: {
        stripeCustomerId: customerSpending.stripeCustomerId,
        email: customerSpending.email,
        name: customerSpending.name,
        phone: customerSpending.phone,
        totalSpent: customerSpending.totalSpent,
        totalTransactions: customerSpending.totalTransactions,
        firstPaymentDate: customerSpending.firstPaymentDate,
        lastPaymentDate: customerSpending.lastPaymentDate,
      },
      cashPayments: payments,
      bookedServices: bookings,
      paymentSummary: {
        totalFromCash: payments.reduce((sum, p) => sum + (p.amount || 0), 0) / 100,
        totalFromBookings: bookings.reduce((sum, b) => sum + (b.totalPaid || 0), 0) / 100,
        totalPayments: payments.length + bookings.length,
      },
    });
  } catch (error) {
    console.error('Failed to fetch customer spending:', error);
    return res.status(500).json({
      error: 'Failed to fetch customer spending',
      details: error.message,
    });
  }
}
