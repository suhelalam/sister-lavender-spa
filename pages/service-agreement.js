export default function ServiceAgreement() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Service Agreement</h1>
      <p className="mb-2">By booking with Sister Lavender Spa, you agree to the following terms:</p>
      <ul className="list-disc pl-6 mb-6 text-left">
        <li>All services are for relaxation and wellness only.</li>
        <li>Please disclose any medical conditions or allergies before your treatment.</li>
        <li>Appointments must be canceled/rescheduled at least 24 hours in advance.</li>
        <li>We are not responsible for reactions to undisclosed conditions.</li>
        <li>Follow spa hygiene and punctuality policies.</li>
        <li>Your information is kept confidential.</li>
      </ul>
      <p className="text-gray-600">Please complete the agreement form and sign digitally if applicable.</p>
    </div>
  );
}
