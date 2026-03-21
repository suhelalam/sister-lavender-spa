import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/router';
import { auth } from '../../lib/firebase';

const parseServiceSummary = (summary) => {
  if (!summary || typeof summary !== 'string') return [];

  return summary
    .split(',')
    .map((segment) => segment.trim())
    .map((segment) => {
      const match = segment.match(/^(\d+)\s*x\s+(.+)$/i);
      if (match) {
        return {
          name: String(match[2] || '').trim(),
          quantity: Math.max(1, Number(match[1] || 1)),
        };
      }
      return { name: segment, quantity: 1 };
    })
    .filter((service) => service.name);
};

const normalizeService = (service) => {
  if (!service || typeof service !== 'object') return null;

  const name = String(service.name || service.title || '').trim();
  if (!name) return null;

  const quantity = Math.max(1, Number(service.quantity || 1));
  const amountRaw = Number(service.amount);
  const unitAmountRaw = Number(service.unit_amount);
  const unitAmountCentsRaw = Number(service.unit_amount_cents);
  const unitAmountAltRaw = Number(service.unitAmountCents);
  const priceRaw = Number(service.price);
  const lineAmountRaw = Number(service.total);
  const lineAmountCentsRaw = Number(service.total_amount_cents);
  const lineAmountAltRaw = Number(service.line_total);

  let unitAmountCents = null;
  if (Number.isFinite(amountRaw) && amountRaw >= 0) {
    unitAmountCents = Math.round(amountRaw);
  } else if (Number.isFinite(unitAmountRaw) && unitAmountRaw >= 0) {
    unitAmountCents = Math.round(unitAmountRaw);
  } else if (Number.isFinite(unitAmountCentsRaw) && unitAmountCentsRaw >= 0) {
    unitAmountCents = Math.round(unitAmountCentsRaw);
  } else if (Number.isFinite(unitAmountAltRaw) && unitAmountAltRaw >= 0) {
    unitAmountCents = Math.round(unitAmountAltRaw);
  } else if (Number.isFinite(priceRaw) && priceRaw >= 0) {
    unitAmountCents = Math.round(priceRaw * 100);
  }

  let lineTotalCents = null;
  if (Number.isFinite(lineAmountRaw) && lineAmountRaw >= 0) {
    lineTotalCents = Math.round(lineAmountRaw);
  } else if (Number.isFinite(lineAmountCentsRaw) && lineAmountCentsRaw >= 0) {
    lineTotalCents = Math.round(lineAmountCentsRaw);
  } else if (Number.isFinite(lineAmountAltRaw) && lineAmountAltRaw >= 0) {
    lineTotalCents = Math.round(lineAmountAltRaw);
  } else if (Number.isFinite(unitAmountCents) && unitAmountCents >= 0) {
    lineTotalCents = Math.round(unitAmountCents * quantity);
  }

  return { name, quantity, unitAmountCents, lineTotalCents };
};

const getServicesFromTransaction = (transaction) => {
  if (Array.isArray(transaction?.stored_services) && transaction.stored_services.length > 0) {
    const normalizedStored = transaction.stored_services.map(normalizeService).filter(Boolean);
    if (normalizedStored.length > 0) return normalizedStored;
  }

  const metadata = transaction?.metadata || {};
  const rawServices = metadata.services;

  if (Array.isArray(rawServices)) {
    return rawServices.map(normalizeService).filter(Boolean);
  }

  if (typeof rawServices === 'string' && rawServices.trim()) {
    try {
      const parsed = JSON.parse(rawServices);
      if (Array.isArray(parsed)) {
        const normalized = parsed.map(normalizeService).filter(Boolean);
        if (normalized.length > 0) return normalized;
      }
    } catch (e) {
      console.error('Error parsing services metadata JSON:', e);
    }

    const parsedSummary = parseServiceSummary(rawServices)
      .map(normalizeService)
      .filter(Boolean);
    if (parsedSummary.length > 0) return parsedSummary;
  }

  return parseServiceSummary(metadata.service_summary)
    .map(normalizeService)
    .filter(Boolean);
};

const formatCurrencyFromCents = (amountCents) => {
  if (!Number.isFinite(amountCents)) return null;
  return `$${(amountCents / 100).toFixed(2)}`;
};

const formatReceiptDate = (createdUnixSeconds) => {
  const date = new Date(createdUnixSeconds * 1000);
  const formatted = date.toLocaleString([], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Keep time and AM/PM together so it doesn't wrap awkwardly.
  return formatted.replace(/\s(AM|PM)$/i, '\u00A0$1');
};

const getServiceAmountCents = (service) => {
  const lineTotalCents = Number(service?.lineTotalCents);
  if (Number.isFinite(lineTotalCents) && lineTotalCents >= 0) return Math.round(lineTotalCents);

  const unitAmountCents = Number(service?.unitAmountCents);
  const quantity = Math.max(1, Number(service?.quantity || 1));
  if (!Number.isFinite(unitAmountCents) || unitAmountCents < 0) return null;
  return Math.round(unitAmountCents * quantity);
};

const getServiceLabel = (service) => {
  const normalizedName = normalizeNameKey(service?.name);
  if (normalizedName === 'custom amount' || normalizedName === 'custom add-on') {
    return 'Custom add-on';
  }
  const qty = service.quantity > 1 ? ` x ${service.quantity}` : '';
  return `${service.name}${qty}`;
};

const isProcessingFeeService = (name) =>
  String(name || '').trim().toLowerCase() === 'processing fee (3%)';

const getServiceLineTotalCents = (service) => {
  const amountCents = getServiceAmountCents(service);
  return Number.isFinite(amountCents) ? amountCents : 0;
};

const getReceiptBreakdown = (transaction, services) => {
  const servicesSubtotalCents = services
    .filter((service) => !isProcessingFeeService(service.name))
    .reduce((sum, service) => sum + getServiceLineTotalCents(service), 0);

  const processingFeeFromLinesCents = services
    .filter((service) => isProcessingFeeService(service.name))
    .reduce((sum, service) => sum + getServiceLineTotalCents(service), 0);
  const processingFeeFromApi = Number(transaction?.processing_fee_amount_cents);
  const processingFeeCents =
    processingFeeFromLinesCents > 0
      ? processingFeeFromLinesCents
      : Number.isFinite(processingFeeFromApi) && processingFeeFromApi >= 0
        ? Math.round(processingFeeFromApi)
        : 0;

  const discountAmountCents = Math.max(0, Number(transaction?.discount_amount_cents || 0));
  const tipAmountCents = Math.max(0, Number(transaction?.tip_amount_cents || 0));
  const totalCents = Math.max(0, Number(transaction?.amount || 0));
  const preTipAmountFromApi = Number(transaction?.pre_tip_amount_cents);
  const preTipAmountCents =
    Number.isFinite(preTipAmountFromApi) && preTipAmountFromApi >= 0
      ? Math.round(preTipAmountFromApi)
      : Math.max(0, totalCents - tipAmountCents);
  const couponCode = String(transaction?.coupon_code || '').trim();
  const couponDiscountDisplay = String(transaction?.coupon_discount_display || '').trim();
  const couponPercentOff = Number(transaction?.coupon_percent_off);
  const couponAmountOffCents = Number(transaction?.coupon_amount_off_cents);
  const couponValueLabel =
    couponDiscountDisplay ||
    (Number.isFinite(couponPercentOff) && couponPercentOff > 0
      ? `${couponPercentOff}% off`
      : Number.isFinite(couponAmountOffCents) && couponAmountOffCents > 0
        ? `${formatCurrencyFromCents(couponAmountOffCents) || '$0.00'} off`
        : '');
  const couponLineLabel =
    couponCode && couponValueLabel
      ? `${couponCode} • ${couponValueLabel}`
      : couponCode || couponValueLabel;

  return {
    servicesSubtotalCents,
    processingFeeCents,
    discountAmountCents,
    tipAmountCents,
    preTipAmountCents,
    totalCents,
    couponCode,
    couponValueLabel,
    couponLineLabel,
  };
};

const normalizeNameKey = (value) => String(value || '').trim().toLowerCase();

export default function AdminReceiptsPage() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [servicePriceMap, setServicePriceMap] = useState({});
  const [dayFilter, setDayFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [receiptEmailInputs, setReceiptEmailInputs] = useState({});
  const [sendingReceiptById, setSendingReceiptById] = useState({});
  const [emailStatusById, setEmailStatusById] = useState({});
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setLoadingAuth(false);
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (loadingAuth) return;

    const loadTransactions = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/admin/receipts');
        if (!response.ok) {
          throw new Error('Failed to fetch receipts');
        }
        const data = await response.json();
        setTransactions(data.receipts);
      } catch (error) {
        console.error('Error loading transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, [loadingAuth]);

  useEffect(() => {
    if (loadingAuth) return;

    const loadServicePrices = async () => {
      try {
        const response = await fetch('/api/list-terminal-products');
        if (!response.ok) return;
        const data = await response.json();
        const items = Array.isArray(data.items) ? data.items : [];

        const nextMap = {};
        items.forEach((item) => {
          const key = normalizeNameKey(item.name);
          const amount = Number(item.amount);
          if (!key || !Number.isFinite(amount) || amount < 0) return;
          // Keep the lowest known active price for fallback display.
          if (!Number.isFinite(nextMap[key]) || amount < nextMap[key]) {
            nextMap[key] = Math.round(amount);
          }
        });
        setServicePriceMap(nextMap);
      } catch (error) {
        console.error('Error loading service prices for receipt fallback:', error);
      }
    };

    loadServicePrices();
  }, [loadingAuth]);

  const withResolvedServicePrices = (services) =>
    services.map((service) => {
      if (Number.isFinite(service?.lineTotalCents) || Number.isFinite(service?.unitAmountCents)) {
        return service;
      }
      const fallbackUnitAmountCents = servicePriceMap[normalizeNameKey(service?.name)];
      if (!Number.isFinite(fallbackUnitAmountCents)) return service;
      const quantity = Math.max(1, Number(service?.quantity || 1));
      return {
        ...service,
        unitAmountCents: Math.round(fallbackUnitAmountCents),
        lineTotalCents: Math.round(fallbackUnitAmountCents * quantity),
      };
    });

  const withReconciledServiceTotals = (services, transaction) => {
    const resolved = withResolvedServicePrices(services).map((service) => ({ ...service }));
    const preTip = Number(transaction?.pre_tip_amount_cents);
    if (!Number.isFinite(preTip) || preTip < 0) return resolved;

    const discount = Math.max(0, Number(transaction?.discount_amount_cents || 0));
    const expectedLinesTotal = Math.round(preTip + discount);

    let knownTotal = 0;
    const missingIndexes = [];
    resolved.forEach((service, idx) => {
      const amountCents = getServiceAmountCents(service);
      if (Number.isFinite(amountCents)) {
        knownTotal += amountCents;
      } else {
        missingIndexes.push(idx);
      }
    });

    const remainder = expectedLinesTotal - knownTotal;
    if (remainder <= 0 || missingIndexes.length === 0) return resolved;

    let targetIndex = missingIndexes.find((idx) =>
      normalizeNameKey(resolved[idx]?.name).includes('custom add-on')
    );
    if (targetIndex === undefined) {
      targetIndex = missingIndexes.find((idx) =>
        normalizeNameKey(resolved[idx]?.name).includes('custom amount')
      );
    }
    if (targetIndex === undefined && missingIndexes.length === 1) {
      targetIndex = missingIndexes[0];
    }
    if (targetIndex === undefined) return resolved;

    resolved[targetIndex].lineTotalCents = Math.round(remainder);
    return resolved;
  };

  const printReceipt = (transaction) => {
    const services = withReconciledServiceTotals(getServicesFromTransaction(transaction), transaction);
    const breakdown = getReceiptBreakdown(transaction, services);
    const total = (breakdown.totalCents / 100).toFixed(2);
    const date = formatReceiptDate(transaction.created);
    const printWindow = window.open('', '_blank', 'width=400,height=700');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body { font-family: monospace; font-size: 12px; width: 80mm; margin: 0; padding: 10px; }
            .header { text-align: center; margin-bottom: 10px; }
            .service-row { margin: 5px 0; display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
            .service-name { flex: 1; }
            .service-price { background: #fff1f2; color: #be123c; font-weight: 700; padding: 1px 6px; border-radius: 999px; white-space: nowrap; }
            .service { margin: 5px 0; }
            .total { font-weight: bold; margin-top: 10px; }
            @media print { body { width: 80mm; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Sister Lavender Spa</h2>
            <p>Receipt</p>
          </div>
          <p><strong>Transaction ID:</strong> ${transaction.id}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Customer:</strong> ${transaction.customer_name || 'N/A'}</p>
          <p><strong>Email:</strong> ${transaction.customer_email || transaction.receipt_email || 'N/A'}</p>
          <p><strong>Phone:</strong> ${transaction.customer_phone || 'N/A'}</p>
          <div>
            <strong>Services:</strong>
            ${
              services.length > 0
                ? services
                    .map((service) => {
                      const amountText = formatCurrencyFromCents(getServiceAmountCents(service)) || '—';
                      return `<div class="service-row"><span class="service-name">${getServiceLabel(service)}</span><span class="service-price">${amountText}</span></div>`;
                    })
                    .join('')
                : '<div class="service">No service details saved</div>'
            }
          </div>
          <div style="margin-top:10px; border-top:1px solid #ddd; padding-top:8px;">
            <div class="service">Services subtotal: ${formatCurrencyFromCents(breakdown.servicesSubtotalCents) || '$0.00'}</div>
            <div class="service">Processing fee: ${formatCurrencyFromCents(breakdown.processingFeeCents) || '$0.00'}</div>
            <div class="service">Coupon${breakdown.couponLineLabel ? ` (${breakdown.couponLineLabel})` : ''}: -${formatCurrencyFromCents(breakdown.discountAmountCents) || '$0.00'}</div>
            <div class="service">Tip: ${formatCurrencyFromCents(breakdown.tipAmountCents) || '$0.00'}</div>
            <div class="service">Pre-tip total: ${formatCurrencyFromCents(breakdown.preTipAmountCents) || '$0.00'}</div>
          </div>
          <div class="total">Total: $${total}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getDefaultReceiptEmail = (transaction) =>
    String(transaction?.customer_email || transaction?.receipt_email || '').trim();

  const getReceiptEmailValue = (transaction) =>
    receiptEmailInputs[transaction.id] ?? getDefaultReceiptEmail(transaction);

  const handleSendReceiptEmail = async (transaction, services, breakdown, date) => {
    const recipient = getReceiptEmailValue(transaction).trim();
    if (!recipient) {
      setEmailStatusById((prev) => ({
        ...prev,
        [transaction.id]: { type: 'error', text: 'Enter an email before sending.' },
      }));
      return;
    }

    setSendingReceiptById((prev) => ({ ...prev, [transaction.id]: true }));
    setEmailStatusById((prev) => ({
      ...prev,
      [transaction.id]: { type: 'info', text: 'Sending receipt email...' },
    }));

    try {
      const payloadServices = Array.isArray(services)
        ? services.map((service) => ({
            label: getServiceLabel(service),
            amountCents: getServiceAmountCents(service) || 0,
          }))
        : [];

      const response = await fetch('/api/admin/send-receipt-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: recipient,
          transaction: {
            id: transaction.id,
            date,
            customerName: transaction.customer_name || '',
            customerEmail: transaction.customer_email || transaction.receipt_email || '',
          },
          services: payloadServices,
          breakdown,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || 'Failed to send receipt email.');
      }

      setEmailStatusById((prev) => ({
        ...prev,
        [transaction.id]: { type: 'success', text: `Receipt sent to ${recipient}.` },
      }));
    } catch (error) {
      setEmailStatusById((prev) => ({
        ...prev,
        [transaction.id]: { type: 'error', text: error.message || 'Failed to send receipt email.' },
      }));
    } finally {
      setSendingReceiptById((prev) => ({ ...prev, [transaction.id]: false }));
    }
  };

  const filteredTransactions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const dateMatch = (() => {
        if (!dayFilter) return true;
        const txDate = new Date(transaction.created * 1000);
        const yyyy = txDate.getFullYear();
        const mm = String(txDate.getMonth() + 1).padStart(2, '0');
        const dd = String(txDate.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}` === dayFilter;
      })();

      if (!dateMatch) return false;
      if (!query) return true;

      const searchHaystack = [
        transaction.customer_name,
        transaction.customer_phone,
        transaction.customer_email,
        transaction.receipt_email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchHaystack.includes(query);
    });
  }, [transactions, dayFilter, searchTerm]);

  if (loadingAuth || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-indigo-50 p-6">
        <div className="mx-auto max-w-5xl animate-pulse rounded-2xl border border-white/70 bg-white/80 p-8 shadow-sm">
          <div className="mb-4 h-8 w-48 rounded bg-gray-200" />
          <div className="mb-8 h-4 w-72 rounded bg-gray-100" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-56 rounded-xl bg-gray-100" />
            <div className="h-56 rounded-xl bg-gray-100" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-indigo-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-2xl border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Receipts</h1>
              <p className="mt-1 text-sm text-gray-600">
                Browse transaction receipts and print for in-store records.
              </p>
              {user?.email && (
                <p className="mt-2 text-xs text-gray-500">Signed in as {user.email}</p>
              )}
            </div>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-sm"
            >
              Back to Admin
            </Link>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[200px_1fr_auto]">
            <div>
              <label htmlFor="dayFilter" className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                Filter by Day
              </label>
              <input
                id="dayFilter"
                type="date"
                value={dayFilter}
                onChange={(e) => setDayFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
              />
            </div>

            <div>
              <label htmlFor="customerSearch" className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                Search Customer
              </label>
              <input
                id="customerSearch"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, phone, or email"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setDayFilter('');
                  setSearchTerm('');
                }}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 md:w-auto"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredTransactions.length} of {transactions.length} receipt{transactions.length === 1 ? '' : 's'}
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white/80 p-10 text-center text-gray-600">
            No receipts found for current filters.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {filteredTransactions.map((transaction) => {
              const services = withReconciledServiceTotals(getServicesFromTransaction(transaction), transaction);
              const breakdown = getReceiptBreakdown(transaction, services);
              const total = (breakdown.totalCents / 100).toFixed(2);
              const date = formatReceiptDate(transaction.created);
              const emailValue = getReceiptEmailValue(transaction);
              const isSendingReceipt = !!sendingReceiptById[transaction.id];
              const emailStatus = emailStatusById[transaction.id];
              return (
                <div
                  key={transaction.id}
                  className="group flex h-full flex-col rounded-2xl border border-white/60 bg-white/90 p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex-1">
                    <div className="mb-4 flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
                      <div>
                        <p className="text-sm font-semibold tracking-wide text-gray-900">Sister Lavender Spa</p>
                        <p className="text-xs uppercase tracking-[0.2em] text-rose-500">Receipt</p>
                      </div>
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700">
                        {transaction.currency?.toUpperCase() || 'USD'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-sm text-gray-700">
                      <p>
                        <span className="font-medium text-gray-900">ID:</span>{' '}
                        <span className="break-all text-xs text-gray-600">{transaction.id}</span>
                      </p>
                      <p><span className="font-medium text-gray-900">Date:</span> {date}</p>
                      <p><span className="font-medium text-gray-900">Customer:</span> {transaction.customer_name || 'N/A'}</p>
                      <p><span className="font-medium text-gray-900">Email:</span> {transaction.customer_email || transaction.receipt_email || 'N/A'}</p>
                      <p><span className="font-medium text-gray-900">Phone:</span> {transaction.customer_phone || 'N/A'}</p>
                    </div>

                    <div className="mt-4 rounded-xl bg-gray-50 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Services</p>
                      {services.length > 0 ? (
                        <div className="space-y-1.5 text-sm text-gray-800">
                          {services.map((service, idx) => (
                            <div key={idx} className="flex items-start justify-between gap-3">
                              <span className="text-gray-800">{getServiceLabel(service)}</span>
                              <span className="whitespace-nowrap rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                                {formatCurrencyFromCents(getServiceAmountCents(service)) || '—'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">No service details saved</div>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                      <p className="text-sm text-gray-600">Services Subtotal</p>
                      <p className="text-sm font-medium text-gray-800">
                        {formatCurrencyFromCents(breakdown.servicesSubtotalCents) || '$0.00'}
                      </p>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-sm text-gray-600">Processing Fee</p>
                      <p className="text-sm font-medium text-gray-800">
                        {formatCurrencyFromCents(breakdown.processingFeeCents) || '$0.00'}
                      </p>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-green-700">
                      <p className="text-sm">
                        Coupon{breakdown.couponLineLabel ? ` (${breakdown.couponLineLabel})` : ''}
                      </p>
                      <p className="text-sm font-medium">
                        -{formatCurrencyFromCents(breakdown.discountAmountCents) || '$0.00'}
                      </p>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-amber-700">
                      <p className="text-sm">Tip</p>
                      <p className="text-sm font-medium">
                        {formatCurrencyFromCents(breakdown.tipAmountCents) || '$0.00'}
                      </p>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-sm text-gray-600">Pre-tip Total</p>
                      <p className="text-sm font-medium text-gray-800">
                        {formatCurrencyFromCents(breakdown.preTipAmountCents) || '$0.00'}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                      <p className="text-sm text-gray-600">Total Charged</p>
                      <p className="text-lg font-semibold text-gray-900">${total}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => printReceipt(transaction)}
                    className="mt-4 w-full rounded-lg bg-rose-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  >
                    Print Receipt
                  </button>

                  <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
                    <label
                      htmlFor={`receipt-email-${transaction.id}`}
                      className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500"
                    >
                      Email Receipt
                    </label>
                    <input
                      id={`receipt-email-${transaction.id}`}
                      type="email"
                      value={emailValue}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        setReceiptEmailInputs((prev) => ({
                          ...prev,
                          [transaction.id]: nextValue,
                        }));
                        setEmailStatusById((prev) => ({
                          ...prev,
                          [transaction.id]: null,
                        }));
                      }}
                      placeholder="customer@example.com"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                    />
                    <button
                      type="button"
                      disabled={isSendingReceipt}
                      onClick={() => handleSendReceiptEmail(transaction, services, breakdown, date)}
                      className="mt-2 w-full rounded-lg bg-gray-900 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSendingReceipt ? 'Sending...' : 'Send Receipt Email'}
                    </button>
                    {emailStatus?.text && (
                      <p
                        className={`mt-2 text-xs ${
                          emailStatus.type === 'success'
                            ? 'text-emerald-700'
                            : emailStatus.type === 'error'
                              ? 'text-red-600'
                              : 'text-gray-600'
                        }`}
                      >
                        {emailStatus.text}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
