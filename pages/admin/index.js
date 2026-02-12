import Link from 'next/link';
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useRouter } from "next/router";

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const router = useRouter();

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

  if (loadingAuth) return <p className="text-center mt-10">Checking authentication...</p>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <button
          onClick={() => auth.signOut().then(() => router.push("/login"))}
          className="bg-red-500 text-white px-3 py-1 rounded text-sm"
        >
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/admin/services">
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition cursor-pointer border border-gray-200">
            <div className="text-3xl mb-3">🛠️</div>
            <h2 className="text-xl font-semibold mb-2">Manage Services</h2>
            <p className="text-gray-600">Add, edit, or delete services and variations</p>
          </div>
        </Link>

        <Link href="/admin/checkins">
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition cursor-pointer border border-gray-200">
            <div className="text-3xl mb-3">📋</div>
            <h2 className="text-xl font-semibold mb-2">Check-In Records</h2>
            <p className="text-gray-600">View customer check-in history</p>
          </div>
        </Link>

        {/* Add more admin features as needed */}
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <div className="text-3xl mb-3">📊</div>
          <h2 className="text-xl font-semibold mb-2">Analytics (Coming Soon)</h2>
          <p className="text-gray-600">Service popularity and booking trends</p>
        </div>

        <Link href="/admin/settings">
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition cursor-pointer border border-gray-200">
            <div className="text-3xl mb-3">⚙️</div>
            <h2 className="text-xl font-semibold mb-2">Settings</h2>
            <p className="text-gray-600">Update business hours and home page announcements</p>
          </div>
        </Link>
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Logged in as: {user?.email}</h3>
        <p className="text-sm text-blue-600">You have full access to manage all spa services and data.</p>
      </div>
    </div>
  );
}
