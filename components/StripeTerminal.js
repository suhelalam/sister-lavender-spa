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

  useEffect(() => {
    const initializeTerminal = async () => {
      try {
        // Dynamically import the terminal JS
        const StripeTerminal = await import('@stripe/terminal-js');
        const terminalInstance = StripeTerminal.Terminal;
        
        const initializedTerminal = await terminalInstance.create({
          onFetchConnectionToken: async () => {
            const response = await fetch('/api/stripe-terminal-token', {
              method: 'POST',
            });
            const { secret } = await response.json();
            return secret;
          },
          onUnexpectedReaderDisconnect: () => {
            setReader(null);
            alert('Reader disconnected');
          },
        });
        
        setTerminal(initializedTerminal);
      } catch (error) {
        console.error('Failed to initialize Stripe Terminal:', error);
      } finally {
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
      const discoveryResult = await terminal.discoverReaders();
      if (discoveryResult.error) {
        console.error('Discovery failed:', discoveryResult.error);
        alert('Failed to discover readers: ' + discoveryResult.error.message);
      } else {
        setReaders(discoveryResult.discoveredReaders);
      }
    } catch (error) {
      console.error('Discovery error:', error);
      alert('Error discovering readers');
    }
  };

  const connectReader = async (readerToConnect) => {
    if (!terminal) return;
    
    try {
      const connectResult = await terminal.connectReader(readerToConnect);
      if (connectResult.error) {
        console.error('Connection failed:', connectResult.error);
        alert('Connection failed: ' + connectResult.error.message);
      } else {
        setReader(connectResult.reader);
      }
    } catch (error) {
      console.error('Connection error:', error);
      alert('Error connecting to reader');
    }
  };

  const disconnectReader = async () => {
    if (!terminal || !reader) return;
    
    try {
      await terminal.disconnectReader();
      setReader(null);
    } catch (error) {
      console.error('Disconnection error:', error);
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
        throw new Error('Failed to create payment intent');
      }

      const paymentIntent = await paymentIntentResponse.json();

      // Process payment
      const collectResult = await terminal.collectPaymentMethod(paymentIntent.client_secret);
      
      if (collectResult.error) {
        throw new Error(collectResult.error.message);
      }

      const confirmResult = await terminal.processPayment(collectResult.paymentIntent);
      
      if (confirmResult.error) {
        throw new Error(confirmResult.error.message);
      }

      alert(`Payment successful! $${amount} charged.`);
      setAmount('');
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="p-6 border rounded-lg bg-white max-w-md mx-auto text-center">
        <h2 className="text-2xl font-bold mb-4 text-purple-700">Stripe Terminal</h2>
        <p>Initializing terminal...</p>
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
                  className="mt-2 bg-gray-200 px-4 py-2 rounded text-sm"
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

      {/* Payment Button */}
      <button
        onClick={handlePayment}
        disabled={!reader || !amount || isLoading}
        className="w-full bg-green-600 text-white p-4 rounded-lg text-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-green-700 transition"
      >
        {isLoading ? 'Processing...' : `Charge $${amount || '0.00'}`}
      </button>
    </div>
  );
}