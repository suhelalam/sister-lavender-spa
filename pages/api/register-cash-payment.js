import Stripe from 'stripe';
import { adminDb, isAdminConfigured } from '../../lib/firebaseAdmin';
import { createVisit, findCustomer, normalizeEmail, normalizePhone, recordPayment, upsertCustomer } from '../../lib/crm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Search for customers in Stripe by email, phone, or name
    const { email, phone, name } = req.query;

    if (!email && !phone && !name) {
      return res.status(400).json({ error: 'Email, phone, or name required for customer search' });
    }

    try {
      const attachCrm = async (stripeCustomer) => {
        if (!isAdminConfigured || !adminDb) return { crmCustomerId: null, rewardsEnrolled: false, pointsBalance: 0 };
        const match = await findCustomer(adminDb, { phone: stripeCustomer.phone, email: stripeCustomer.email });
        const crmCustomer = match?.exists
          ? { id: match.id, ...match.data() }
          : await upsertCustomer(adminDb, { name: stripeCustomer.name, phone: stripeCustomer.phone, email: stripeCustomer.email, stripeCustomerId: stripeCustomer.id });
        return { crmCustomerId: crmCustomer.id, rewardsEnrolled: Boolean(crmCustomer.rewards?.enrolled), pointsBalance: Number(crmCustomer.pointsBalance || 0) };
      };
      if (isAdminConfigured && adminDb) {
        let crmQuery = null;
        if (email) crmQuery = adminDb.collection('customers').where('emailNormalized', '==', normalizeEmail(email)).limit(10);
        else if (phone) crmQuery = adminDb.collection('customers').where('phoneNormalized', '==', normalizePhone(phone)).limit(10);
        else if (name) crmQuery = adminDb.collection('customers').where('searchTokens', 'array-contains', String(name).trim().toLowerCase()).limit(10);
        const crmMatches = crmQuery ? await crmQuery.get() : null;
        if (crmMatches && !crmMatches.empty) {
          const customers = crmMatches.docs.map((doc) => {
            const customer = doc.data();
            return {
              id: customer.stripeCustomerId || null,
              crmCustomerId: doc.id,
              email: customer.email || '', phone: customer.phone || '', name: customer.name || 'Customer',
              rewardsEnrolled: Boolean(customer.rewards?.enrolled),
              pointsBalance: Number(customer.pointsBalance || 0),
            };
          });
          return res.status(200).json(customers.length === 1
            ? { customerFound: true, multipleMatches: false, customer: customers[0] }
            : { customerFound: true, multipleMatches: true, customers });
        }
      }
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
            const customers = await Promise.all(searchResults.data.map(async (c) => ({
              id: c.id, email: c.email, name: c.name, phone: c.phone,
              ...(await attachCrm(c)),
            })));
            return res.status(200).json({
              customerFound: true,
              multipleMatches: true,
              customers,
            });
          }
          stripeCustomer = searchResults.data[0];
        }
      }

      if (stripeCustomer) {
        const crm = await attachCrm(stripeCustomer);
        return res.status(200).json({
          customerFound: true,
          multipleMatches: false,
          customer: {
            id: stripeCustomer.id,
            email: stripeCustomer.email,
            name: stripeCustomer.name,
            phone: stripeCustomer.phone,
            metadata: stripeCustomer.metadata,
            ...crm,
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

  if (!isAdminConfigured || !adminDb) {
    return res.status(503).json({
      error: 'Cash payment storage is unavailable. Configure Firebase admin credentials.',
    });
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
      customerId,
      rewardPointsToRedeem,
      rewardDiscountAmount,
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    const requestedRewardPoints = Math.max(0, Math.round(Number(rewardPointsToRedeem || 0)));
    const requestedRewardDiscount = Math.max(0, Number(rewardDiscountAmount || 0));
    if (requestedRewardPoints > 0) {
      if (requestedRewardPoints !== 500 || requestedRewardDiscount !== 10 || !customerId) {
        return res.status(400).json({ error: 'Invalid rewards redemption.' });
      }
      const rewardCustomer = await adminDb.collection('customers').doc(String(customerId)).get();
      if (!rewardCustomer.exists || !rewardCustomer.data()?.rewards?.enrolled || Number(rewardCustomer.data()?.pointsBalance || 0) < 500) {
        return res.status(409).json({ error: 'Customer does not have enough points to redeem this reward.' });
      }
    }

    const safeStripeCustomerId = String(stripeCustomerId || '').trim() || null;
    let resolvedCustomerEmail = customerEmail ? String(customerEmail).toLowerCase().trim() : null;
    let resolvedCustomerPhone = customerPhone ? String(customerPhone).trim() : null;
    let resolvedCustomerName = customerName ? String(customerName).trim() : null;

    // If a Stripe customer is selected, backfill missing customer fields from Stripe.
    if (safeStripeCustomerId) {
      try {
        const stripeCustomer = await stripe.customers.retrieve(safeStripeCustomerId);
        if (!stripeCustomer.deleted) {
          if (!resolvedCustomerEmail && stripeCustomer.email) {
            resolvedCustomerEmail = String(stripeCustomer.email).toLowerCase().trim();
          }
          if (!resolvedCustomerPhone && stripeCustomer.phone) {
            resolvedCustomerPhone = String(stripeCustomer.phone).trim();
          }
          if (!resolvedCustomerName && stripeCustomer.name) {
            resolvedCustomerName = String(stripeCustomer.name).trim();
          }
        }
      } catch (stripeLookupError) {
        console.warn('Failed to fetch Stripe customer for cash payment:', stripeLookupError);
      }
    }

    // Generate receipt number (timestamp-based for simplicity)
    const receiptNumber = `CASH-${Date.now()}`;
    const timestamp = new Date().toISOString();

    let cashPaymentId = receiptNumber;
    // Save cash payment record to Firebase for record-keeping
    try {
      const paymentDoc = {
        type: 'cash',
        amount: amount,
        services: services || [],
        couponCode: couponCode || '',
        discountAmount: discountAmount || 0,
        rewardPointsRedeemed: Number(rewardPointsToRedeem || 0),
        rewardDiscountAmount: Number(rewardDiscountAmount || 0),
        receiptNumber: receiptNumber,
        timestamp: timestamp,
        createdAt: new Date(),
        // Customer reference (Stripe ID is primary)
        stripeCustomerId: safeStripeCustomerId,
        customerEmail: resolvedCustomerEmail,
        customerPhone: resolvedCustomerPhone,
        customerName: resolvedCustomerName,
        // Alias keys for consistency with receipt payload shapes.
        customer_email: resolvedCustomerEmail,
        customer_phone: resolvedCustomerPhone,
        customer_name: resolvedCustomerName,
      };

      const docRef = await adminDb.collection('cashPayments').add(paymentDoc);
      cashPaymentId = docRef.id;

      // If customer info provided, also update a customer spending summary
      if (safeStripeCustomerId || resolvedCustomerEmail || resolvedCustomerPhone) {
        try {
          const customerSpendingRef = adminDb.collection('customerSpending');
          const searchEmail = resolvedCustomerEmail;

          // Search for existing spending record by Stripe ID first, then email
          let snapshots = { docs: [], size: 0 };
          if (safeStripeCustomerId) {
            snapshots = await customerSpendingRef
              .where('stripeCustomerId', '==', safeStripeCustomerId)
              .limit(1)
              .get();
          } else if (searchEmail) {
            snapshots = await customerSpendingRef.where('email', '==', searchEmail).limit(1).get();
          }

          if (snapshots.size > 0) {
            // Update existing record
            const existingDoc = snapshots.docs[0];
            await existingDoc.ref.update({
              totalSpent: (existingDoc.data().totalSpent || 0) + amount,
              totalTransactions: (existingDoc.data().totalTransactions || 0) + 1,
              lastPaymentDate: timestamp,
              paymentIds: [...(existingDoc.data().paymentIds || []), docRef.id],
            });
          } else {
            // Create new spending record
            await customerSpendingRef.add({
              stripeCustomerId: safeStripeCustomerId,
              email: searchEmail,
              phone: resolvedCustomerPhone,
              name: resolvedCustomerName,
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

    if (resolvedCustomerEmail || resolvedCustomerPhone) {
      try {
        const existingCustomer = customerId
          ? await adminDb.collection('customers').doc(String(customerId)).get()
          : await findCustomer(adminDb, { phone: resolvedCustomerPhone, email: resolvedCustomerEmail });
        const customer = await upsertCustomer(adminDb, {
          customerId: existingCustomer?.exists ? existingCustomer.id : null,
          name: resolvedCustomerName || '', phone: resolvedCustomerPhone || '',
          email: resolvedCustomerEmail || '', stripeCustomerId: safeStripeCustomerId,
        });
        const openVisits = await adminDb.collection('visits').where('customerId', '==', customer.id).limit(20).get();
        let visit = openVisits.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((item) => item.paymentStatus !== 'paid')
          .sort((a, b) => String(b.checkedInAt || '').localeCompare(String(a.checkedInAt || '')))[0];
        if (!visit) {
          visit = await createVisit(adminDb, customer, {
            status: 'completed',
            services: (services || []).map((item) => ({ name: item.name, amount: item.amount, quantity: item.quantity })),
            serviceTotalCents: Math.round(Number(amount) * 100),
          });
        }
        await recordPayment(adminDb, {
          customerId: customer.id, visitId: visit.id,
          externalPaymentId: `cash_${cashPaymentId}`, provider: 'cash', method: 'cash',
          status: 'succeeded', amountCents: Math.round(Number(amount) * 100),
          eligibleAmountCents: Math.round(Number(amount) * 100),
          discountCents: Math.round((Number(discountAmount || 0) + Number(rewardDiscountAmount || 0)) * 100),
          pointsToRedeem: Number(rewardPointsToRedeem || 0),
          rewardDiscountCents: Math.round(Number(rewardDiscountAmount || 0) * 100),
        });
      } catch (crmError) {
        console.error('Cash payment CRM recording failed:', crmError);
      }
    }

    return res.status(200).json({
      ok: true,
      receiptNumber: receiptNumber,
      timestamp: timestamp,
      amount: amount,
      services: services,
      discountAmount: discountAmount,
      customerTracked: !!(safeStripeCustomerId || resolvedCustomerEmail || resolvedCustomerPhone),
    });
  } catch (error) {
    console.error('Cash payment registration failed:', error);
    return res.status(500).json({
      error: 'Failed to register cash payment',
      details: error.message,
    });
  }
}
