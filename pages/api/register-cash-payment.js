import { db } from '../../lib/firebase';
import { addDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Search for customers in Stripe by email, phone, or name
    const { email, phone, name } = req.query;

    if (!email && !phone && !name) {
      return res.status(400).json({ error: 'Email, phone, or name required for customer search' });
    }

    try {
      let stripeCustomer = null;

      // Search Stripe customers by email (highest priority)
      if (email) {
        const searchResults = await stripe.customers.search({
          query: `email:"${email.toLowerCase()}"`,
          limit: 1,
        });

        if (searchResults.data && searchResults.data.length > 0) {
          stripeCustomer = searchResults.data[0];
        }
      }

      // Search by phone if email didn't find anything
      if (!stripeCustomer && phone) {
        const normalizePhoneForStripe = (rawPhone) => {
          const digits = (rawPhone || '').replace(/\D/g, '');
          if (!digits) return null;
          if (digits.length === 10) return `+1${digits}`;
          if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
          if (rawPhone.startsWith('00')) return `+${digits.slice(2)}`;
          return digits.startsWith('+') ? digits : `+${digits}`;
        };

        const phoneCandidates = [];
        const raw = phone.trim();
        const digits = raw.replace(/\D/g, '');
        if (raw) phoneCandidates.push(raw);
        if (digits) phoneCandidates.push(digits);
        const normalized = normalizePhoneForStripe(raw);
        if (normalized) phoneCandidates.push(normalized);

        for (const candidate of Array.from(new Set(phoneCandidates))) {
          const searchResults = await stripe.customers.search({
            query: `phone:"${candidate}"`,
            limit: 1,
          });
          if (searchResults.data && searchResults.data.length > 0) {
            stripeCustomer = searchResults.data[0];
            break;
          }
        }
      }

      // Search by name if email and phone didn't find anything
      if (!stripeCustomer && name) {
        const searchResults = await stripe.customers.search({
          query: `name:"${name}"`,
          limit: 5, // Return up to 5 results for name search (more likely to have duplicates)
        });

        if (searchResults.data && searchResults.data.length > 0) {
          // If multiple results, return all of them so user can pick
          if (searchResults.data.length > 1) {
            return res.status(200).json({
              customerFound: true,
              multipleMatches: true,
              customers: searchResults.data.map((c) => ({
                id: c.id,
                email: c.email,
                name: c.name,
                phone: c.phone,
              })),
            });
          }
          stripeCustomer = searchResults.data[0];
        }
      }

      if (stripeCustomer) {
        return res.status(200).json({
          customerFound: true,
          multipleMatches: false,
          customer: {
            id: stripeCustomer.id,
            email: stripeCustomer.email,
            name: stripeCustomer.name,
            phone: stripeCustomer.phone,
            metadata: stripeCustomer.metadata,
          },
        });
      } else {
        return res.status(200).json({
          customerFound: false,
          customer: null,
        });
      }
    } catch (error) {
      console.error('Stripe customer search failed:', error);
      return res.status(500).json({
        error: 'Failed to search for customer in Stripe',
        details: error.message,
      });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const {
      amount,
      services,
      couponCode,
      discountAmount,
      customerEmail,
      customerPhone,
      customerName,
      stripeCustomerId,
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Generate receipt number (timestamp-based for simplicity)
    const receiptNumber = `CASH-${Date.now()}`;
    const timestamp = new Date().toISOString();

    // Save cash payment record to Firebase for record-keeping
    try {
      const paymentDoc = {
        type: 'cash',
        amount: amount,
        services: services || [],
        couponCode: couponCode || '',
        discountAmount: discountAmount || 0,
        receiptNumber: receiptNumber,
        timestamp: timestamp,
        createdAt: new Date(),
        // Customer reference (Stripe ID is primary)
        stripeCustomerId: stripeCustomerId || null,
        customerEmail: customerEmail ? customerEmail.toLowerCase() : null,
        customerPhone: customerPhone || null,
        customerName: customerName || null,
      };

      const docRef = await addDoc(collection(db, 'cashPayments'), paymentDoc);

      // If customer info provided, also update a customer spending summary
      if (stripeCustomerId || customerEmail || customerPhone) {
        try {
          const customerSpendingRef = collection(db, 'customerSpending');
          const searchEmail = customerEmail ? customerEmail.toLowerCase() : null;

          // Search for existing spending record by Stripe ID first, then email
          let q = null;
          if (stripeCustomerId) {
            q = query(
              customerSpendingRef,
              where('stripeCustomerId', '==', stripeCustomerId)
            );
          } else if (searchEmail) {
            q = query(customerSpendingRef, where('email', '==', searchEmail));
          }

          const snapshots = q ? await getDocs(q) : { docs: [], size: 0 };

          if (snapshots.size > 0) {
            // Update existing record
            const existingDoc = snapshots.docs[0];
            await updateDoc(existingDoc.ref, {
              totalSpent: (existingDoc.data().totalSpent || 0) + amount,
              totalTransactions: (existingDoc.data().totalTransactions || 0) + 1,
              lastPaymentDate: timestamp,
              paymentIds: [...(existingDoc.data().paymentIds || []), docRef.id],
            });
          } else {
            // Create new spending record
            await addDoc(customerSpendingRef, {
              stripeCustomerId: stripeCustomerId || null,
              email: searchEmail,
              phone: customerPhone || null,
              name: customerName || null,
              totalSpent: amount,
              totalTransactions: 1,
              lastPaymentDate: timestamp,
              firstPaymentDate: timestamp,
              paymentIds: [docRef.id],
              createdAt: new Date(),
            });
          }
        } catch (spendingError) {
          console.warn('Failed to update customer spending:', spendingError);
          // Continue - spending update is not critical
        }
      }
    } catch (firebaseError) {
      console.warn('Failed to save cash payment to Firebase:', firebaseError);
      // Continue even if Firebase save fails - receipt generation is still valid
    }

    return res.status(200).json({
      ok: true,
      receiptNumber: receiptNumber,
      timestamp: timestamp,
      amount: amount,
      services: services,
      discountAmount: discountAmount,
      customerTracked: !!(stripeCustomerId || customerEmail || customerPhone),
    });
  } catch (error) {
    console.error('Cash payment registration failed:', error);
    return res.status(500).json({
      error: 'Failed to register cash payment',
      details: error.message,
    });
  }
}
