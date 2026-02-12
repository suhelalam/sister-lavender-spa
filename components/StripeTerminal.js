// components/StripeTerminal.js
'use client';
import { useEffect, useMemo, useState } from 'react';

export default function StripeTerminal() {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Track the active PI so we can cancel it
  const [activePaymentIntentId, setActivePaymentIntentId] = useState(null);
  const [activeReaderId, setActiveReaderId] = useState(null);
  const [isCanceling, setIsCanceling] = useState(false);

  // Server-driven: readers come from your backend (Stripe API)
  const [readers, setReaders] = useState([]);
  const [selectedReaderId, setSelectedReaderId] = useState('');
  const [loadingReaders, setLoadingReaders] = useState(true);
  const [readersError, setReadersError] = useState(null);

  const [includeFee, setIncludeFee] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [customDiscount, setCustomDiscount] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // ----- Amount math (unchanged from your logic) -----
  const baseAmount = parseFloat(amount) || 0;

  const activeDiscount = showCustomInput && customDiscount ? parseFloat(customDiscount) : discount;
  const discountAmount = baseAmount * (activeDiscount / 100);
  const amountAfterDiscount = baseAmount - discountAmount;

  const feeAmount = amountAfterDiscount * 0.03;
  const totalWithFee = amountAfterDiscount + feeAmount;

  const displayAmount = includeFee ? totalWithFee : amountAfterDiscount;
  const finalChargeAmount = Math.round(displayAmount * 100);

  const discountOptions = useMemo(
    () => [
      { value: 5, label: '5% Off' },
      { value: 10, label: '10% Off' },
      { value: 15, label: '15% Off' },
      { value: 20, label: '20% Off' },
    ],
    []
  );

  const handleDiscountSelect = (discountValue) => {
    setDiscount(discountValue);
    setShowCustomInput(false);
    setCustomDiscount('');
  };

  const handleCustomDiscountToggle = () => {
    setShowCustomInput(true);
    setDiscount(0);
    setCustomDiscount('');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setAmount('');
    setIncludeFee(false);
    setDiscount(0);
    setCustomDiscount('');
    setShowCustomInput(false);
  };

  // ----- Cancel server-driven payment -----
  const cancelPayment = async () => {
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
      setActivePaymentIntentId(null);
      setActiveReaderId(null);
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
    if (!selectedReaderId) {
      alert('Please select a reader first');
      return;
    }
    if (!amount || baseAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      // 1) Create PI
      const piResp = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: finalChargeAmount, currency: 'usd' }),
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
        }),
      });

      if (!processResp.ok) throw new Error(await processResp.text());
      await processResp.json();

      alert('Sent to reader. Complete the payment on the S700.');

      // Important: without webhooks, we don’t know when it succeeds.
      // Keep the cancel button available while you’re waiting on the reader.
      // If you prefer, you can clear activePaymentIntentId manually after you confirm success.
      resetForm();
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed: ' + (error.message || String(error)));
      setActivePaymentIntentId(null);
      setActiveReaderId(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 border rounded-lg bg-white max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-purple-700">Stripe Terminal</h2>

      {/* Amount Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Base Amount ($)</label>
        <input
          type="number"
          step="0.01"
          min="0.50"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full p-3 border rounded-lg text-lg mb-3"
          disabled={isLoading || isCanceling}
        />

        {/* Discount Options */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-2">Discount</label>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {discountOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleDiscountSelect(option.value)}
                disabled={isLoading || isCanceling}
                className={`p-2 border rounded-lg text-sm transition ${
                  discount === option.value && !showCustomInput
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                } disabled:opacity-60`}
              >
                {option.label}
              </button>
            ))}
            <button
              onClick={handleCustomDiscountToggle}
              disabled={isLoading || isCanceling}
              className={`p-2 border rounded-lg text-sm transition ${
                showCustomInput
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } disabled:opacity-60`}
            >
              Custom %
            </button>
          </div>

          {showCustomInput && (
            <div className="flex items-center space-x-2 p-2 border rounded-lg bg-yellow-50">
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={customDiscount}
                onChange={(e) => setCustomDiscount(e.target.value)}
                placeholder="Enter discount %"
                className="flex-1 p-2 border rounded text-sm"
                disabled={isLoading || isCanceling}
              />
              <span className="text-sm text-gray-600 whitespace-nowrap">% off</span>
              <button
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomDiscount('');
                  setDiscount(0);
                }}
                disabled={isLoading || isCanceling}
                className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-60"
                title="Close custom discount"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* 3% Fee Option */}
        <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="includeFee"
              checked={includeFee}
              onChange={(e) => setIncludeFee(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded"
              disabled={isLoading || isCanceling}
            />
            <label htmlFor="includeFee" className="text-sm font-medium">
              Add 3% processing fee
            </label>
          </div>
          {includeFee && amount && <span className="text-sm text-gray-600">+${feeAmount.toFixed(2)}</span>}
        </div>

        {/* Amount Summary */}
        {amount && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Base amount:</span>
              <span>${baseAmount.toFixed(2)}</span>
            </div>

            {activeDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>
                  Discount ({activeDiscount}%{showCustomInput && ' custom'}):
                </span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}

            {(activeDiscount > 0 || includeFee) && (
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
        <button
          onClick={handlePayment}
          disabled={!selectedReaderId || !amount || isLoading || isCanceling}
          className="w-full bg-green-600 text-white p-4 rounded-lg text-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-green-700 transition"
        >
          {isLoading ? 'Sending to reader...' : `Charge $${displayAmount.toFixed(2) || '0.00'}`}
        </button>

        {/* Cancel Button - show when we have an active PI to cancel */}
        {activePaymentIntentId && (
          <button
            onClick={cancelPayment}
            disabled={isCanceling}
            className="w-full bg-red-600 text-white p-4 rounded-lg text-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-red-700 transition"
          >
            {isCanceling ? 'Canceling...' : 'Cancel Payment'}
          </button>
        )}
      </div>
    </div>
  );
}
