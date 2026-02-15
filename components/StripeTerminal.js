// components/StripeTerminal.js
'use client';
import { useEffect, useMemo, useState } from 'react';

export default function StripeTerminal() {
  const [amount, setAmount] = useState('');
  const [additionalCharge, setAdditionalCharge] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stripeItems, setStripeItems] = useState([]);
  const [selectedStripeItemId, setSelectedStripeItemId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [selectedCouponId, setSelectedCouponId] = useState('');
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [couponsError, setCouponsError] = useState(null);
  const [loadingStripeItems, setLoadingStripeItems] = useState(true);
  const [stripeItemsError, setStripeItemsError] = useState(null);
  const [cartPreviewShown, setCartPreviewShown] = useState(false);

  // Track the active PI so we can cancel it
  const [activePaymentIntentId, setActivePaymentIntentId] = useState(null);
  const [activeReaderId, setActiveReaderId] = useState(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);

  // Server-driven: readers come from your backend (Stripe API)
  const [readers, setReaders] = useState([]);
  const [selectedReaderId, setSelectedReaderId] = useState('');
  const [loadingReaders, setLoadingReaders] = useState(true);
  const [readersError, setReadersError] = useState(null);

  const [includeFee, setIncludeFee] = useState(true);
  const selectedCoupon = coupons.find((coupon) => coupon.id === selectedCouponId) || null;

  const filteredStripeItems = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return stripeItems;
    return stripeItems.filter(
      (item) =>
        item.label.toLowerCase().includes(term) ||
        item.name.toLowerCase().includes(term)
    );
  }, [stripeItems, productSearch]);

  const selectedServicesAmount = selectedServices.reduce(
    (sum, item) => sum + (item.amount / 100) * item.quantity,
    0
  );
  const manualAmount = parseFloat(amount) || 0;
  const additionalChargeAmount = parseFloat(additionalCharge) || 0;
  const primaryAmount = selectedServices.length > 0 ? selectedServicesAmount : manualAmount;

  // ----- Amount math -----
  const baseAmount = primaryAmount + additionalChargeAmount;

  const percentDiscountAmount =
    selectedCoupon?.discount_type === 'percent'
      ? baseAmount * ((selectedCoupon.percent_off || 0) / 100)
      : 0;
  const fixedDiscountAmount =
    selectedCoupon?.discount_type === 'amount' ? (selectedCoupon.amount_off || 0) / 100 : 0;
  const discountAmount = Math.min(baseAmount, percentDiscountAmount + fixedDiscountAmount);
  const amountAfterDiscount = baseAmount - discountAmount;

  const amountAfterDiscountCents = Math.max(0, Math.round(amountAfterDiscount * 100));
  const feeAmountCents = includeFee ? Math.max(0, Math.round(amountAfterDiscountCents * 0.03)) : 0;
  const finalChargeAmount = amountAfterDiscountCents + feeAmountCents;
  const feeAmount = feeAmountCents / 100;
  const displayAmount = finalChargeAmount / 100;

  const refreshStripeItems = async () => {
    setLoadingStripeItems(true);
    setStripeItemsError(null);
    try {
      const r = await fetch('/api/list-terminal-products');
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setStripeItems(data.items || []);
    } catch (e) {
      setStripeItemsError(e.message || 'Failed to load Stripe products');
    } finally {
      setLoadingStripeItems(false);
    }
  };

  const refreshCoupons = async () => {
    setLoadingCoupons(true);
    setCouponsError(null);
    try {
      const r = await fetch('/api/list-terminal-coupons');
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setCoupons(data.coupons || []);
    } catch (e) {
      setCouponsError(e.message || 'Failed to load coupons');
    } finally {
      setLoadingCoupons(false);
    }
  };

  // ----- Load readers from backend -----
  const refreshReaders = async () => {
    setLoadingReaders(true);
    setReadersError(null);
    try {
      const r = await fetch('/api/list-readers');
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      const list = data.readers || [];
      setReaders(list);

      // Auto-select first reader if none chosen
      if (!selectedReaderId && list.length > 0) {
        setSelectedReaderId(list[0].id);
      }
    } catch (e) {
      setReadersError(e.message || 'Failed to load readers');
    } finally {
      setLoadingReaders(false);
    }
  };

  useEffect(() => {
    refreshReaders();
    refreshStripeItems();
    refreshCoupons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedStripeItemId && filteredStripeItems.length > 0) {
      setSelectedStripeItemId(filteredStripeItems[0].id);
    }
  }, [filteredStripeItems, selectedStripeItemId]);

  useEffect(() => {
    setCartPreviewShown(false);
  }, [selectedServices, selectedReaderId, includeFee, selectedCouponId, amount, additionalCharge]);

  const clearTerminalUiState = () => {
    setActivePaymentIntentId(null);
    setActiveReaderId(null);
    setCartPreviewShown(false);
  };

  const clearReaderDisplay = async (readerId) => {
    if (!readerId) return;
    try {
      await fetch('/api/clear-reader-display', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reader_id: readerId }),
      });
    } catch (error) {
      console.warn('Failed to clear reader display:', error);
    }
  };

  const waitForTerminalPaymentResult = async (paymentIntentId) => {
    const timeoutMs = 120000;
    const intervalMs = 2000;
    const startedAt = Date.now();
    let lastStatus = null;

    while (Date.now() - startedAt < timeoutMs) {
      const resp = await fetch('/api/payment-intent-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_intent_id: paymentIntentId }),
      });

      if (!resp.ok) {
        throw new Error(await resp.text());
      }

      const data = await resp.json();
      const status = data?.status;
      lastStatus = status;

      // For terminal/server-driven flows, requires_capture can still represent
      // a successful authorization depending on account settings.
      if (status === 'succeeded' || status === 'requires_capture') return 'succeeded';
      if (status === 'canceled') return 'canceled';

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    if (lastStatus === 'requires_payment_method') return 'not_completed';
    return 'timeout';
  };

  const resetForm = () => {
    setAmount('');
    setAdditionalCharge('');
    setSelectedStripeItemId('');
    setProductSearch('');
    setSelectedServices([]);
    setIncludeFee(true);
    setSelectedCouponId('');
    setCartPreviewShown(false);
  };

  const addSelectedService = () => {
    if (!selectedStripeItemId) return;

    const matched = stripeItems.find((item) => item.id === selectedStripeItemId);
    if (!matched) return;

    setSelectedServices((prev) => {
      const existing = prev.find((service) => service.id === matched.id);
      if (existing) {
        return prev.map((service) =>
          service.id === matched.id ? { ...service, quantity: service.quantity + 1 } : service
        );
      }
      return [...prev, { ...matched, quantity: 1 }];
    });
  };

  const updateServiceQuantity = (id, nextQuantity) => {
    setSelectedServices((prev) => {
      if (nextQuantity <= 0) return prev.filter((service) => service.id !== id);
      return prev.map((service) =>
        service.id === id ? { ...service, quantity: nextQuantity } : service
      );
    });
  };

  // ----- Cancel server-driven payment -----
  const cancelPayment = async () => {
    if (!activePaymentIntentId && cartPreviewShown) {
      setIsCanceling(true);
      try {
        const clearResp = await fetch('/api/clear-reader-display', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reader_id: activeReaderId || selectedReaderId }),
        });

        if (!clearResp.ok) throw new Error(await clearResp.text());
        await clearResp.json();

        setPaymentStatus({ type: 'info', text: 'Reader cart cleared.' });
        setCartPreviewShown(false);
        alert('Reader cart cleared.');
      } catch (error) {
        console.error('Clear cart failed:', error);
        alert('Clear cart failed: ' + (error.message || String(error)));
      } finally {
        setIsCanceling(false);
      }
      return;
    }

    if (!activePaymentIntentId) return;

    setIsCanceling(true);
    try {
      const resp = await fetch('/api/cancel-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_intent_id: activePaymentIntentId,
          reader_id: activeReaderId || selectedReaderId,
        }),
      });

      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();

      alert('Payment canceled.');
      if (data?.reader_cancel_error) {
        alert(`Payment intent canceled, but reader cancel failed: ${data.reader_cancel_error}`);
      }
      setPaymentStatus({ type: 'info', text: 'Payment canceled.' });
      clearTerminalUiState();
      setIsLoading(false);
    } catch (error) {
      console.error('Cancel failed:', error);
      alert('Cancel failed: ' + (error.message || String(error)));
    } finally {
      setIsCanceling(false);
    }
  };

  // ----- Server-driven payment -----
  const handlePayment = async () => {
    setPaymentStatus(null);
    if (!selectedReaderId) {
      alert('Please select a reader first');
      return;
    }
    if (baseAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      const selectedCoupon = coupons.find((coupon) => coupon.id === selectedCouponId) || null;
      const baseServiceLines =
        selectedServices.length > 0
          ? selectedServices.map((service) => ({
              name: service.name,
              amount: Math.max(0, Math.round(Number(service.amount || 0))),
              quantity: Math.max(1, Math.round(Number(service.quantity || 1))),
            }))
          : manualAmount > 0
            ? [
                {
                  name: 'Custom amount',
                  amount: Math.max(0, Math.round(manualAmount * 100)),
                  quantity: 1,
                },
              ]
            : [];

      const additionalChargeCents = Math.max(0, Math.round(additionalChargeAmount * 100));
      const linesWithCustomCharge =
        additionalChargeCents > 0
          ? [
              ...baseServiceLines,
              {
                name: 'Custom add-on',
                amount: additionalChargeCents,
                quantity: 1,
              },
            ]
          : baseServiceLines;

      const servicesForCharge =
        feeAmountCents > 0
          ? [
              ...linesWithCustomCharge,
              {
                name: 'Processing fee (3%)',
                amount: feeAmountCents,
                quantity: 1,
              },
            ]
          : linesWithCustomCharge;

      if (selectedServices.length > 0 && !cartPreviewShown) {
        const displayResp = await fetch('/api/display-cart-on-reader', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reader_id: selectedReaderId,
            amount: finalChargeAmount,
            services: servicesForCharge,
          }),
        });

        if (!displayResp.ok) throw new Error(await displayResp.text());
        const displayData = await displayResp.json();
        if (!displayData.ok) {
          throw new Error(displayData.reader_display_error || 'Failed to show services on reader');
        }

        setCartPreviewShown(true);
        setPaymentStatus({ type: 'info', text: 'Services shown on reader. Click charge to start payment.' });
        alert('Services displayed on reader. Press charge again to start payment.');
        return;
      }

      // 1) Create PI
      const piResp = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: finalChargeAmount,
          currency: 'usd',
          services: servicesForCharge,
          coupon_code: selectedCoupon?.code || '',
        }),
      });

      if (!piResp.ok) throw new Error(await piResp.text());
      const piData = await piResp.json();

      if (!piData.payment_intent_id) {
        throw new Error('Missing payment_intent_id from create-payment-intent response');
      }

      // store PI so we can cancel from UI
      setActivePaymentIntentId(piData.payment_intent_id);
      setActiveReaderId(selectedReaderId);

      // 2) Tell reader to process it
      const processResp = await fetch('/api/process-on-reader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reader_id: selectedReaderId,
          payment_intent_id: piData.payment_intent_id,
          amount: finalChargeAmount,
          services: servicesForCharge,
        }),
      });

      if (!processResp.ok) throw new Error(await processResp.text());
      await processResp.json();

      setPaymentStatus({ type: 'info', text: 'Waiting for payment on terminal...' });
      const paymentResult = await waitForTerminalPaymentResult(piData.payment_intent_id);

      if (paymentResult === 'succeeded') {
        await clearReaderDisplay(selectedReaderId);
        setPaymentStatus({ type: 'success', text: 'Payment successful.' });
        clearTerminalUiState();
        resetForm();
        return;
      }

      if (paymentResult === 'canceled' || paymentResult === 'failed') {
        setPaymentStatus({
          type: 'error',
          text: paymentResult === 'canceled' ? 'Payment was canceled.' : 'Payment failed. Please try again.',
        });
        clearTerminalUiState();
        return;
      }

      if (paymentResult === 'not_completed') {
        setPaymentStatus({
          type: 'info',
          text: 'Payment was not completed on the reader. You can try charging again.',
        });
        clearTerminalUiState();
        return;
      }

      setPaymentStatus({
        type: 'info',
        text: 'Payment is still processing on terminal. You can cancel if needed.',
      });
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed: ' + (error.message || String(error)));
      setPaymentStatus({ type: 'error', text: 'Payment failed. Please try again.' });
      clearTerminalUiState();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 border rounded-lg bg-white max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-purple-700">Stripe Terminal</h2>

      {/* Amount Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Select Service (Stripe)</label>
        {loadingStripeItems ? (
          <div className="p-3 border rounded-lg bg-gray-50 text-sm text-gray-600 mb-3">
            Loading Stripe products...
          </div>
        ) : stripeItemsError ? (
          <div className="p-3 border rounded-lg bg-red-50 border-red-200 text-sm mb-3">
            <p className="text-red-600">Failed to load products: {stripeItemsError}</p>
            <button
              onClick={refreshStripeItems}
              className="mt-2 bg-purple-600 text-white px-3 py-2 rounded text-xs"
              disabled={isLoading || isCanceling}
            >
              Retry Products
            </button>
          </div>
        ) : (
          <div className="space-y-2 mb-3">
            <input
              type="text"
              value={productSearch}
              onChange={(e) => {
                setProductSearch(e.target.value);
                setSelectedStripeItemId('');
              }}
              placeholder="Search services..."
              className="w-full p-3 border rounded-lg"
              disabled={isLoading || isCanceling}
            />
            <select
              value={selectedStripeItemId}
              onChange={(e) => {
                setSelectedStripeItemId(e.target.value);
              }}
              className="w-full p-3 border rounded-lg"
              disabled={isLoading || isCanceling}
            >
              <option value="">
                {filteredStripeItems.length ? 'Select a service to add' : 'No matching services'}
              </option>
              {filteredStripeItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <button
              onClick={addSelectedService}
              className="w-full bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition disabled:opacity-60 text-sm"
              disabled={!selectedStripeItemId || isLoading || isCanceling}
            >
              Add Service
            </button>
            <button
              onClick={refreshStripeItems}
              className="w-full bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 transition disabled:opacity-60 text-sm"
              disabled={isLoading || isCanceling}
            >
              Refresh Stripe Products
            </button>
            {selectedServices.length > 0 && (
              <div className="border rounded-lg p-3 bg-gray-50 space-y-2">
                <p className="text-sm font-medium">Selected Services</p>
                {selectedServices.map((service) => (
                  <div key={service.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate">{service.name}</p>
                      <p className="text-gray-600">
                        ${(service.amount / 100).toFixed(2)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateServiceQuantity(service.id, service.quantity - 1)}
                        className="px-2 py-1 border rounded"
                        disabled={isLoading || isCanceling}
                      >
                        -
                      </button>
                      <span className="w-5 text-center">{service.quantity}</span>
                      <button
                        onClick={() => updateServiceQuantity(service.id, service.quantity + 1)}
                        className="px-2 py-1 border rounded"
                        disabled={isLoading || isCanceling}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <label className="block text-sm font-medium mb-2">Base Amount ($)</label>
        <input
          type="number"
          step="0.01"
          min="0.50"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={selectedServices.length > 0 ? 'Calculated from selected services' : '0.00'}
          className="w-full p-3 border rounded-lg text-lg mb-3"
          disabled={isLoading || isCanceling || selectedServices.length > 0}
        />

        <label className="block text-sm font-medium mb-2">Additional Custom Charge ($)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={additionalCharge}
          onChange={(e) => setAdditionalCharge(e.target.value)}
          placeholder="0.00"
          className="w-full p-3 border rounded-lg text-lg mb-3"
          disabled={isLoading || isCanceling}
        />

        {/* Discount Options */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-2">Coupon</label>
          {loadingCoupons ? (
            <div className="p-2 border rounded-lg bg-gray-50 text-sm text-gray-600">
              Loading coupons...
            </div>
          ) : couponsError ? (
            <div className="p-2 border rounded-lg bg-red-50 border-red-200 text-sm">
              <p className="text-red-600">Failed to load coupons: {couponsError}</p>
              <button
                onClick={refreshCoupons}
                disabled={isLoading || isCanceling}
                className="mt-2 bg-purple-600 text-white px-3 py-2 rounded text-xs"
              >
                Retry Coupons
              </button>
            </div>
          ) : (
            <select
              value={selectedCouponId}
              onChange={(e) => setSelectedCouponId(e.target.value)}
              className="w-full p-3 border rounded-lg"
              disabled={isLoading || isCanceling}
            >
              <option value="">No coupon</option>
              {coupons.map((coupon) => (
                <option key={coupon.id} value={coupon.id}>
                  {coupon.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 3% Fee Always Included */}
        <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
          <span className="text-sm font-medium">Card processing fee (3%)</span>
          {baseAmount > 0 && <span className="text-sm text-gray-600">+${feeAmount.toFixed(2)}</span>}
        </div>

        {/* Amount Summary */}
        {baseAmount > 0 && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Services/custom amount:</span>
              <span>${primaryAmount.toFixed(2)}</span>
            </div>
            {additionalChargeAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Custom add-on:</span>
                <span>${additionalChargeAmount.toFixed(2)}</span>
              </div>
            )}
            {additionalChargeAmount > 0 && (
              <div className="flex justify-between text-sm font-medium border-t border-blue-200 pt-1 mt-1">
                <span>Subtotal:</span>
                <span>${baseAmount.toFixed(2)}</span>
              </div>
            )}

            {selectedCoupon && discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>
                  Coupon ({selectedCoupon.code}):
                </span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}

            {(discountAmount > 0 || includeFee) && (
              <div className="flex justify-between text-sm font-medium border-t border-blue-200 pt-1 mt-1">
                <span>After discount:</span>
                <span>${amountAfterDiscount.toFixed(2)}</span>
              </div>
            )}

            {includeFee && (
              <div className="flex justify-between text-sm">
                <span>Processing fee (3%):</span>
                <span>+${feeAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between font-semibold border-t border-blue-200 pt-2 mt-2">
              <span>Total to charge:</span>
              <span>${displayAmount.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Reader Selection (server-driven) */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3">Card Reader</h3>

        {loadingReaders ? (
          <div className="p-4 border rounded-lg bg-gray-50 text-center text-gray-600">
            Loading readers...
          </div>
        ) : readersError ? (
          <div className="p-4 border rounded-lg bg-red-50 border-red-200">
            <p className="text-red-600 text-sm">Failed to load readers: {readersError}</p>
            <button
              onClick={refreshReaders}
              className="mt-2 bg-purple-600 text-white px-4 py-2 rounded text-sm"
              disabled={isLoading || isCanceling}
            >
              Retry
            </button>
          </div>
        ) : readers.length === 0 ? (
          <div className="p-4 border rounded-lg bg-gray-50 text-center">
            <p className="text-gray-600">No readers found in Stripe.</p>
            <button
              onClick={refreshReaders}
              className="mt-2 bg-purple-600 text-white px-4 py-2 rounded text-sm"
              disabled={isLoading || isCanceling}
            >
              Refresh
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <select
              value={selectedReaderId}
              onChange={(e) => setSelectedReaderId(e.target.value)}
              className="w-full p-3 border rounded-lg"
              disabled={isLoading || isCanceling}
            >
              {readers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label || r.device_type || 'Reader'} — {r.id}
                </option>
              ))}
            </select>

            <button
              onClick={refreshReaders}
              className="w-full bg-purple-600 text-white p-3 rounded-lg hover:bg-purple-700 transition disabled:opacity-60"
              disabled={isLoading || isCanceling}
            >
              Refresh Readers
            </button>
          </div>
        )}
      </div>

      {/* Payment Buttons */}
      <div className="space-y-3">
        {paymentStatus && (
          <div
            className={`p-3 rounded text-sm ${
              paymentStatus.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : paymentStatus.type === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}
          >
            {paymentStatus.text}
          </div>
        )}

        <button
          onClick={handlePayment}
          disabled={!selectedReaderId || baseAmount <= 0 || isLoading || isCanceling}
          className="w-full bg-green-600 text-white p-4 rounded-lg text-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-green-700 transition"
        >
          {isLoading
            ? 'Sending to reader...'
            : selectedServices.length > 0 && !cartPreviewShown
              ? `Show Services on Reader ($${displayAmount.toFixed(2)})`
              : `Charge $${displayAmount.toFixed(2) || '0.00'}`}
        </button>

        {/* Cancel Button - show when we have an active PI to cancel */}
        {(activePaymentIntentId || cartPreviewShown) && (
          <button
            onClick={cancelPayment}
            disabled={isCanceling}
            className="w-full bg-red-600 text-white p-4 rounded-lg text-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-red-700 transition"
          >
            {isCanceling ? 'Canceling...' : cartPreviewShown && !activePaymentIntentId ? 'Clear Reader Cart' : 'Cancel Payment'}
          </button>
        )}
      </div>
    </div>
  );
}
