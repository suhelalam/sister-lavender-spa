export default function Confirmation() {
  return (
    <div className="max-w-lg mx-auto mt-10 p-6 border rounded shadow text-center">
      <h1 className="text-3xl font-bold mb-4">Thank you for your purchase!</h1>
      <p className="mb-6">Your payment was successful.</p>
      <p>If you have any questions, please contact us at <a href="mailto:selena@sisterlavenderspa.com" className="text-purple-600 underline">selena@sisterlavenderspa.com</a>.</p>
      <a href="/" className="mt-6 inline-block bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700">
        Return to Home
      </a>
    </div>
  );
}
