import { useEffect, useState } from "react";
import axios from "axios";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useRouter } from "next/router";

export default function AdminCheckinsPage() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [checkins, setCheckins] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const router = useRouter();

  // Protect the page with Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setLoadingAuth(false);
      } else {
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch check-in data once user is authenticated
  useEffect(() => {
    if (!user) return;

    const fetchCheckins = async () => {
      try {
        const res = await axios.get("/api/admin/checkins");
        setCheckins(res.data.checkins);
        setFiltered(res.data.checkins);
      } catch (err) {
        console.error("Failed to fetch check-ins", err);
      }
    };

    fetchCheckins();
  }, [user]);

  // Filter logic
  useEffect(() => {
    const term = searchTerm.toLowerCase();

    const filteredData = checkins.filter((item) => {
      const matchSearch =
        (item.customerName && item.customerName.toLowerCase().includes(term)) ||
        (item.phone && item.phone.toLowerCase().includes(term)) ||
        (item.email && item.email.toLowerCase().includes(term));

      const matchDate = selectedDate
        ? new Date(item.timestamp).toISOString().slice(0, 10) === selectedDate
        : true;

      return matchSearch && matchDate;
    });

    setFiltered(filteredData);
  }, [searchTerm, selectedDate, checkins]);

  // Show loading or redirecting
  if (loadingAuth) return <p className="text-center mt-10">Checking authentication...</p>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">📋 Check-In Records</h1>
        <button
          onClick={() => auth.signOut().then(() => router.push("/login"))}
          className="bg-gray-200 px-3 py-1 rounded text-sm"
        >
          Logout
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <input
          type="text"
          placeholder="Search name, phone, or email"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-2 border rounded w-full sm:w-1/2"
        />

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="p-2 border rounded w-full sm:w-1/3"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500">No records found.</p>
      ) : (
        <ul className="space-y-4">
          {filtered.map((item) => (
            <li key={item.id} className="p-4 border rounded">
              <p><strong>{item.customerName}</strong></p>
              {item.phone && <p className="text-sm text-gray-700">📞 {item.phone}</p>}
              {item.email && <p className="text-sm text-gray-700">📧 {item.email}</p>}
              <p className="text-xs text-gray-500">🕒 {new Date(item.timestamp).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
