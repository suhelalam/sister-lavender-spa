export default function Location() {
  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Our Location</h1>

      <div className="mb-6 space-y-2 text-center">
        <p>
          Visit us at <strong>2706 W Chicago Ave, Chicago, IL 60622</strong> —
          conveniently located in the heart of the West Town neighborhood.
        </p>
        <p>
          Enjoy easy access with <strong>free street parking</strong> available nearby.
        </p>
        <p>
          We’re open <strong>7 days a week</strong> and committed to providing a peaceful,
          rejuvenating experience every day.
        </p>
      </div>

      <div className="mb-8 flex justify-center">
        <div>
          <h2 className="text-2xl font-semibold mb-2 text-center">Business Hours</h2>
          <ul className="list-none text-gray-700 text-left">
            <li className="flex">
              <span className="w-24 font-semibold">Monday:</span>
              <span>9:30AM - 8:00PM</span>
            </li>
            <li className="flex">
              <span className="w-24 font-semibold">Tuesday:</span>
              <span>Closed</span>
            </li>
            <li className="flex">
              <span className="w-24 font-semibold">Wednesday:</span>
              <span>9:30AM - 8:00PM</span>
            </li>
            <li className="flex">
              <span className="w-24 font-semibold">Thursday:</span>
              <span>9:30AM - 8:00PM</span>
            </li>
            <li className="flex">
              <span className="w-24 font-semibold">Friday:</span>
              <span>9:30AM - 8:00PM</span>
            </li>
            <li className="flex">
              <span className="w-24 font-semibold">Saturday:</span>
              <span>9:30AM - 8:00PM</span>
            </li>
            <li className="flex">
              <span className="w-24 font-semibold">Sunday:</span>
              <span>9:30AM - 6:00PM</span>
            </li>
          </ul>

        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2 text-center">Find Us on the Map</h2>
        <div className="w-full aspect-video rounded overflow-hidden shadow-lg">
          <iframe
            title="Google Map"
            className="w-full h-full"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2969.8444870431166!2d-87.69554302415485!3d41.89572977124186!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x880fd2fd39e4e3d9%3A0x2f2a0ae4d4b8aa8!2s2706%20W%20Chicago%20Ave%2C%20Chicago%2C%20IL%2060612!5e0!3m2!1sen!2sus!4v1718652761005!5m2!1sen!2sus"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          ></iframe>
        </div>
      </div>

      <div className="text-center text-sm text-gray-600">
        <p>Questions? Call or email us for directions or parking info.</p>
      </div>
    </main>
  );
}
