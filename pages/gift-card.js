import { useEffect } from 'react';

export default function GiftCard() {
  useEffect(() => {
    // Load Gift Up script dynamically
    const script = document.createElement('script');
    script.src = 'https://cdn.giftup.app/dist/gift-up.js';
    script.async = true;
    
    // Initialize Gift Up once script loads
    script.onload = () => {
      if (window.giftup) {
        window.giftup();
      }
    };
    
    document.head.appendChild(script);
    
    // Cleanup function to remove script on unmount
    return () => {
      const existingScript = document.querySelector('script[src="https://cdn.giftup.app/dist/gift-up.js"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      {/* Header section */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-purple-700 mb-6">Give the Gift of Relaxation</h1>
        <p className="text-gray-700 text-lg mb-4">
          Whether it&apos;s a birthday, anniversary, or just because - treat your loved ones to a moment of peace and pampering.
        </p>
        <p className="text-gray-700 text-lg mb-8">
          Our gift cards can be used for any of our spa services and are the perfect way to show you care.
        </p>
      </div>

      {/* Gift Up Checkout Widget */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div 
          className="gift-up-target" 
          data-site-id="df249f17-d97c-4f28-a7e1-08de347f3724" 
          data-platform="Other"
        ></div>
      </div>
    </main>
  );
}
