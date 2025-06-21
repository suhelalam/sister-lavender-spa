import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import axios from "axios";

export default function CheckInPage({ bookingId }) {
  const sigCanvas = useRef(null);

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  // Removed dob input, replaced with serviceDate set on submit
  const [agreed, setAgreed] = useState(false);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const clearSignature = () => {
    sigCanvas.current.clear();
  };

  const validate = () => {
    const newErrors = {};
    if (!customerName.trim()) newErrors.customerName = "Name is required";
    if (!agreed) newErrors.agreed = "You must agree to proceed";
    if (!sigCanvas.current || sigCanvas.current.isEmpty())
      newErrors.signature = "Signature is required";
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    const signature = sigCanvas.current.getTrimmedCanvas().toDataURL("image/png");

    setIsSubmitting(true);

    try {
      // Prepare payload with all fields, serviceDate = today
      const payload = {
        bookingId,
        customerName: customerName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        serviceDate: new Date().toISOString().split("T")[0], // yyyy-mm-dd format of today
        agreed,
        notes: notes.trim(),
        signature,
        timestamp: new Date().toISOString(),
      };

      const res = await axios.post("/api/checkin", payload);

      if (res.data.success) {
        setSuccess(true);
      } else {
        throw new Error("Submission failed");
      }
    } catch (err) {
      console.error("Check-in failed:", err);
      alert("There was an error submitting the form.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto p-4 border rounded shadow text-center">
        <p className="text-green-600 font-semibold mb-4">✅ You’re checked in! Thank you.</p>
        <p>
          Booking ID: <strong>{bookingId || "N/A"}</strong>
        </p>
        <p>We look forward to serving you!</p>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0]; // yyyy-mm-dd

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-md mx-auto p-4 border rounded shadow space-y-4"
      noValidate
    >
      <h1 className="text-xl font-bold mb-4">Check-In & Service Agreement</h1>

      <div>
        <label className="block mb-1 font-medium" htmlFor="customerName">
          Name
        </label>
        <input
          id="customerName"
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          disabled={isSubmitting}
          className={`w-full p-2 border rounded ${
            errors.customerName ? "border-red-500" : "border-gray-300"
          }`}
          required
        />
        {errors.customerName && (
          <p className="text-red-600 text-sm mt-1">{errors.customerName}</p>
        )}
      </div>

      {/* Optional fields */}
      <div>
        <label className="block mb-1 font-medium" htmlFor="email">
          Email (optional)
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          className="w-full p-2 border border-gray-300 rounded"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label className="block mb-1 font-medium" htmlFor="phone">
          Phone (optional)
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={isSubmitting}
          className="w-full p-2 border border-gray-300 rounded"
          placeholder="(123) 456-7890"
        />
      </div>

      <div>
        <label className="block mb-1 font-medium" htmlFor="address">
          Address (optional)
        </label>
        <input
          id="address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={isSubmitting}
          className="w-full p-2 border border-gray-300 rounded"
          placeholder="123 Main St, City, State"
        />
      </div>

      <div>
        <label className="block mb-1 font-medium" htmlFor="serviceDate">
            Service Date
        </label>
        <input
            id="serviceDate"
            type="date"
            value={today}
            readOnly
            disabled
            className="w-full p-2 border border-gray-300 rounded bg-gray-100 cursor-not-allowed"
        />
      </div>

      {/* Notes textarea */}
      <div>
        <label className="block mb-1 font-medium" htmlFor="notes">
          Allergies / Health Notes (optional)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isSubmitting}
          rows={3}
          className="w-full p-2 border border-gray-300 rounded"
          placeholder="Please disclose any relevant health conditions or allergies"
        />
      </div>

      <p className="text-sm text-gray-700">
        By signing below, you confirm that you have disclosed any relevant health
        conditions, allergies, or injuries. You agree to proceed with the services at your own discretion
        and release the salon from liability.
      </p>

      <div>
        <SignatureCanvas
          ref={sigCanvas}
          penColor="black"
          canvasProps={{
            width: 400,
            height: 150,
            className: `border rounded ${
              errors.signature ? "border-red-500" : "border-gray-300"
            } mb-2`,
          }}
          clearOnResize={false}
          disabled={isSubmitting}
        />
        {errors.signature && (
          <p className="text-red-600 text-sm mb-2">{errors.signature}</p>
        )}
        <button
          type="button"
          onClick={clearSignature}
          disabled={isSubmitting}
          className="text-sm text-purple-700 underline mb-4"
        >
          Clear Signature
        </button>
      </div>

      <label className="flex items-center mb-4">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          disabled={isSubmitting}
          required
          className="mr-2"
        />
        I have read and agree to the above.
      </label>
      {errors.agreed && (
        <p className="text-red-600 text-sm mb-4">{errors.agreed}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 w-full disabled:opacity-60"
      >
        {isSubmitting ? "Submitting..." : "Sign and Check In"}
      </button>
    </form>
  );
}
