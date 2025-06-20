'use client';

import { useState, useRef } from 'react';
import SignaturePad from 'react-signature-canvas';

export default function CheckInPage({ service }) {
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [signed, setSigned] = useState(false);
  const sigPadRef = useRef();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!name || !agreed || sigPadRef.current.isEmpty()) {
      alert("Please enter your name, agree to the terms, and sign.");
      return;
    }

    const signatureDataURL = sigPadRef.current.getTrimmedCanvas().toDataURL("image/png");

    setSigned(true);

    // TODO: Send this to your backend
    console.log("Customer Check-in:", {
      serviceName: service?.name,
      customerName: name,
      agreed,
      timestamp: new Date().toISOString(),
      signature: signatureDataURL,
    });
  };

  const clearSignature = () => {
    sigPadRef.current.clear();
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Customer Check-In</h1>

      <div className="mb-4 p-4 border rounded shadow-sm bg-gray-50">
        <h2 className="text-lg font-semibold">{service?.name}</h2>
        <p className="text-sm text-gray-600">
          Duration: {Math.round(service?.variations?.[0]?.duration / 60000)} minutes
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-6 text-sm text-gray-800 bg-white border p-4 rounded">
          <p className="mb-2 font-semibold">Service Agreement:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>I acknowledge that I am voluntarily undergoing this service.</li>
            <li>I have disclosed any known allergies, injuries, or medical conditions.</li>
            <li>I understand the potential risks and release the provider from liability.</li>
            <li>I agree to notify the provider of any discomfort during the service.</li>
            <li>I give consent to receive the selected service.</li>
          </ul>
        </div>

        <div className="mb-4">
          <label className="block font-medium mb-1">Full Name:</label>
          <input
            type="text"
            className="w-full border rounded p-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Type your name here"
            required
          />
        </div>

        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="mr-2"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            I have read and agree to the service agreement above.
          </label>
        </div>

        <div className="mb-6">
          <label className="block font-medium mb-2">Signature:</label>
          <div className="border rounded bg-white">
            <SignaturePad
              ref={sigPadRef}
              canvasProps={{
                className: "w-full h-32"
              }}
            />
          </div>
          <button
            type="button"
            onClick={clearSignature}
            className="mt-2 text-sm text-red-500 hover:underline"
          >
            Clear Signature
          </button>
        </div>

        <button
          type="submit"
          className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
        >
          Sign & Check In
        </button>

        {signed && (
          <p className="text-green-600 text-sm mt-4 font-medium">
            Thank you, {name}! You are now checked in.
          </p>
        )}
      </form>
    </div>
  );
}
