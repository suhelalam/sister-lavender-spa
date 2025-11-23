// components/StripeTerminal.js
'use client';
import { useState, useEffect } from 'react';

export default function StripeTerminal() {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [terminal, setTerminal] = useState(null);
  const [reader, setReader] = useState(null);
  const [readers, setReaders] = useState([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState(null);
  const [currentPaymentIntent, setCurrentPaymentIntent] = useState(null);
  const [includeFee, setIncludeFee] = useState(false);
  const [discount, setDiscount] = useState(0); // 0 = no discount
  const [customDiscount, setCustomDiscount] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Calculate amounts with discount applied first, then fee
  const baseAmount = parseFloat(amount) || 0;
  
  // Determine which discount to use
  const activeDiscount = showCustomInput && customDiscount ? parseFloat(customDiscount) : discount;
  const discountAmount = baseAmount * (activeDiscount / 100);
  const amountAfterDiscount = baseAmount - discountAmount;
  const feeAmount = amountAfterDiscount * 0.03;
  const totalWithFee = amountAfterDiscount + feeAmount;
  
  // Determine final display amount and charge amount
  const displayAmount = includeFee ? totalWithFee : amountAfterDiscount;
  const finalChargeAmount = Math.round(displayAmount * 100); // Convert to cents

  // Handle discount selection
  const handleDiscountSelect = (discountValue) => {
    setDiscount(discountValue);
    setShowCustomInput(false);
    setCustomDiscount('');
  };

  // Handle custom discount toggle
  const handleCustomDiscountToggle = () => {
    setShowCustomInput(true);
    setDiscount(0);
    setCustomDiscount('');
  };

  useEffect(() => {
    const initializeTerminal = async () => {
      try {
        console.log('Starting terminal initialization...');
        
        // Load Stripe Terminal from CDN
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/terminal/v1/';
        script.async = true;
        
        script.onload = async () => {
          try {
            console.log('Stripe Terminal CDN loaded, window.StripeTerminal:', window.StripeTerminal);
            
            if (!window.StripeTerminal) {
              throw new Error('StripeTerminal not found on window object');
            }

            const initializedTerminal = await window.StripeTerminal.create({
              onFetchConnectionToken: async () => {
                console.log('Fetching connection token...');
                try {
                  const response = await fetch('/api/stripe-terminal-token', {
                    method: 'POST',
                  });
                  if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                  }
                  const data = await response.json();
                  console.log('Connection token received');
                  return data.secret;
                } catch (error) {
                  console.error('Error fetching connection token:', error);
                  throw error;
                }
              },
              onUnexpectedReaderDisconnect: () => {
                console.log('Reader disconnected unexpectedly');
                setReader(null);
                alert('Reader disconnected');
              },
            });
            
            console.log('Terminal created successfully:', initializedTerminal);
            setTerminal(initializedTerminal);
            setInitError(null);
          } catch (error) {
            console.error('Failed to create terminal:', error);
            setInitError(error.message);
          } finally {
            setIsInitializing(false);
          }
        };

        script.onerror = () => {
          console.error('Failed to load Stripe Terminal script');
          setInitError('Failed to load Stripe Terminal library');
          setIsInitializing(false);
        };

        document.head.appendChild(script);

      } catch (error) {
        console.error('Failed to initialize Stripe Terminal:', error);
        setInitError(error.message);
        setIsInitializing(false);
      }
    };

    initializeTerminal();
  }, []);

  const discoverReaders = async () => {
    if (!terminal) {
      alert('Terminal not initialized yet');
      return;
    }
    
    try {
      console.log('Discovering readers...');
      const discoveryResult = await terminal.discoverReaders();
      console.log('Discovery result:', discoveryResult);
      
      if (discoveryResult.error) {
        console.error('Discovery failed:', discoveryResult.error);
        alert('Failed to discover readers: ' + discoveryResult.error.message);
      } else {
        setReaders(discoveryResult.discoveredReaders);
        console.log('Discovered readers:', discoveryResult.discoveredReaders);
      }
    } catch (error) {
      console.error('Discovery error:', error);
      alert('Error discovering readers: ' + error.message);
    }
  };

  const connectReader = async (readerToConnect) => {
    if (!terminal) return;
    
    try {
      console.log('Connecting to reader:', readerToConnect);
      const connectResult = await terminal.connectReader(readerToConnect);
      console.log('Connect result:', connectResult);
      
      if (connectResult.error) {
        console.error('Connection failed:', connectResult.error);
        alert('Connection failed: ' + connectResult.error.message);
      } else {
        setReader(connectResult.reader);
        console.log('Reader connected successfully');
      }
    } catch (error) {
      console.error('Connection error:', error);
      alert('Error connecting to reader: ' + error.message);
    }
  };

  const disconnectReader = async () => {
    if (!terminal || !reader) return;
    
    try {
      await terminal.disconnectReader();
      setReader(null);
      console.log('Reader disconnected');
    } catch (error) {
      console.error('Disconnection error:', error);
    }
  };

  const cancelCurrentPayment = async () => {
    if (!terminal) {
      alert('Terminal not initialized');
      return;
    }

    try {
      console.log('Canceling current payment...');
      await terminal.cancelCollectPaymentMethod();
      setIsLoading(false);
      setCurrentPaymentIntent(null);
      alert('Payment canceled');
    } catch (error) {
      console.error('Error canceling payment:', error);
      alert('Error canceling payment: ' + error.message);
    }
  };

  const handlePayment = async () => {
    if (!terminal || !reader) {
      alert('Please connect a card reader first');
      return;
    }

    if (!amount || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Creating payment intent for amount:', finalChargeAmount);
      
      // Create payment intent
      const paymentIntentResponse = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: finalChargeAmount,
          currency: 'usd',
        }),
      });

      if (!paymentIntentResponse.ok) {
        const errorText = await paymentIntentResponse.text();
        throw new Error(`API error: ${paymentIntentResponse.status} - ${errorText}`);
      }

      const paymentIntent = await paymentIntentResponse.json();
      console.log('Payment intent created:', paymentIntent);
      setCurrentPaymentIntent(paymentIntent);

      // Process payment
      console.log('Collecting payment method...');
      const collectResult = await terminal.collectPaymentMethod(paymentIntent.client_secret);
      console.log('Collect result:', collectResult);
      
      if (collectResult.error) {
        throw new Error(collectResult.error.message);
      }

      console.log('Processing payment...');
      const confirmResult = await terminal.processPayment(collectResult.paymentIntent);
      console.log('Confirm result:', confirmResult);
      
      if (confirmResult.error) {
        throw new Error(confirmResult.error.message);
      }

      // Show detailed success message
      let successMessage = `Payment successful! `;
      if (activeDiscount > 0) {
        const discountLabel = showCustomInput ? `${activeDiscount}% (custom)` : `${activeDiscount}%`;
        successMessage += `$${baseAmount.toFixed(2)} - $${discountAmount.toFixed(2)} (${discountLabel} discount) = $${amountAfterDiscount.toFixed(2)}`;
      } else {
        successMessage += `$${baseAmount.toFixed(2)}`;
      }
      
      if (includeFee) {
        successMessage += ` + $${feeAmount.toFixed(2)} fee = $${totalWithFee.toFixed(2)} charged.`;
      } else {
        successMessage += ` charged.`;
      }
      
      alert(successMessage);
      
      // Reset form
      setAmount('');
      setIncludeFee(false);
      setDiscount(0);
      setCustomDiscount('');
      setShowCustomInput(false);
      setCurrentPaymentIntent(null);
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed: ' + error.message);
      setCurrentPaymentIntent(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Discount options
  const discountOptions = [
    { value: 5, label: '5% Off' },
    { value: 10, label: '10% Off' },
    { value: 15, label: '15% Off' },
    { value: 20, label: '20% Off' },
  ];

  if (isInitializing) {
    return (
      <div className="p-6 border rounded-lg bg-white max-w-md mx-auto text-center">
        <h2 className="text-2xl font-bold mb-4 text-purple-700">Stripe Terminal</h2>
        <p>Loading Stripe Terminal library...</p>
        {initError && (
          <p className="text-red-500 mt-2">Error: {initError}</p>
        )}
      </div>
    );
  }

  if (initError) {
    return (
      <div className="p-6 border rounded-lg bg-white max-w-md mx-auto text-center">
        <h2 className="text-2xl font-bold mb-4 text-purple-700">Stripe Terminal</h2>
        <p className="text-red-500">Failed to initialize terminal: {initError}</p>
        <p className="text-sm text-gray-600 mt-2">
          Make sure you have internet connection and try refreshing the page.
        </p>
      </div>
    );
  }

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
        />
        
        {/* Discount Options */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-2">Discount</label>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {discountOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleDiscountSelect(option.value)}
                className={`p-2 border rounded-lg text-sm transition ${
                  discount === option.value && !showCustomInput
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            ))}
            <button
              onClick={handleCustomDiscountToggle}
              className={`p-2 border rounded-lg text-sm transition ${
                showCustomInput
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Custom %
            </button>
          </div>

          {/* Custom Discount Input */}
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
              />
              <span className="text-sm text-gray-600 whitespace-nowrap">% off</span>
              <button
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomDiscount('');
                  setDiscount(0);
                }}
                className="p-2 text-red-600 hover:bg-red-50 rounded"
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
            />
            <label htmlFor="includeFee" className="text-sm font-medium">
              Add 3% processing fee
            </label>
          </div>
          {includeFee && amount && (
            <span className="text-sm text-gray-600">
              +${feeAmount.toFixed(2)}
            </span>
          )}
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
                  Discount ({activeDiscount}%
                  {showCustomInput && ' custom'}):
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

      {/* Reader Connection */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3">Card Reader</h3>
        
        {!reader ? (
          <div>
            <p className="text-sm text-gray-600 mb-3">Connect your Stripe Reader S700:</p>
            {readers.length > 0 ? (
              <div className="space-y-2">
                {readers.map(reader => (
                  <button
                    key={reader.id}
                    onClick={() => connectReader(reader)}
                    className="w-full bg-purple-600 text-white p-3 rounded-lg hover:bg-purple-700 transition"
                  >
                    Connect {reader.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center p-4 border rounded-lg bg-gray-50">
                <p className="text-gray-600">No readers found</p>
                <button 
                  onClick={discoverReaders}
                  className="mt-2 bg-purple-600 text-white px-4 py-2 rounded text-sm"
                >
                  Search Readers
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center p-4 border rounded-lg bg-green-50 border-green-200">
            <p className="text-green-600 font-semibold">
              ✅ Connected to: {reader.label}
            </p>
            <button
              onClick={disconnectReader}
              className="mt-2 bg-red-600 text-white px-4 py-2 rounded text-sm"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Payment Buttons */}
      <div className="space-y-3">
        <button
          onClick={handlePayment}
          disabled={!reader || !amount || isLoading}
          className="w-full bg-green-600 text-white p-4 rounded-lg text-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-green-700 transition"
        >
          {isLoading ? 'Processing...' : `Charge $${displayAmount.toFixed(2) || '0.00'}`}
        </button>
        
        {/* Cancel Button - Only show when payment is in progress */}
        {isLoading && (
          <button
            onClick={cancelCurrentPayment}
            className="w-full bg-red-600 text-white p-4 rounded-lg text-lg font-semibold hover:bg-red-700 transition"
          >
            Cancel Payment
          </button>
        )}
      </div>
    </div>
  );
}