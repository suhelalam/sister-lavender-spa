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
      console.log('Creating payment intent for amount:', amount);
      
      // Create payment intent
      const paymentIntentResponse = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(parseFloat(amount) * 100),
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

      alert(`Payment successful! $${amount} charged.`);
      setAmount('');
      setCurrentPaymentIntent(null);
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed: ' + error.message);
      setCurrentPaymentIntent(null);
    } finally {
      setIsLoading(false);
    }
  };

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
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Amount to Charge ($)</label>
        <input
          type="number"
          step="0.01"
          min="0.50"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full p-3 border rounded-lg text-lg"
        />
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
          {isLoading ? 'Processing...' : `Charge $${amount || '0.00'}`}
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