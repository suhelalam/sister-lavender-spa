import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/router';
import { auth } from '../../lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function AdminCheckinsPage() {
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [checkins, setCheckins] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/login');
        return;
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (loadingAuth) return;

    const loadCheckins = async () => {
      setLoading(true);
      setError('');
      try {
        const checkinRef = collection(db, 'checkins');
        const q = query(checkinRef, orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCheckins(items);
      } catch (err) {
        console.error('Failed to load check-ins:', err);
        setError(String(err?.message || err || 'Failed to load check-ins'));
      } finally {
        setLoading(false);
      }
    };

    loadCheckins();
  }, [loadingAuth]);

  const filteredCheckins = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return checkins;

    return checkins.filter((item) => {
      const haystack = [
        item.customerName,
        item.email,
        item.phone,
        item.address,
        item.notes,
        item.serviceDate,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [checkins, searchTerm]);

  if (loadingAuth) return <p className="text-center mt-10">Checking authentication...</p>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Check-In Records</h1>
          <p className="text-sm text-gray-500 mt-1">Review completed check-ins</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin" className="bg-gray-200 px-3 py-2 rounded text-sm hover:bg-gray-300">
            Back to Admin
          </Link>
          <button
            onClick={() => auth.signOut().then(() => router.push('/login'))}
            className="bg-red-500 text-white px-3 py-2 rounded text-sm"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, email, phone, notes..."
          className="w-full p-3 border rounded"
        />
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-gray-600">Loading check-ins...</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">{error}</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 text-sm text-gray-600">
            Showing {filteredCheckins.length} of {checkins.length} check-ins
          </div>
          <div className="divide-y">
            {filteredCheckins.length === 0 ? (
              <div className="p-6 text-gray-500 text-sm">No check-ins found.</div>
            ) : (
              filteredCheckins.map((item) => (
                <div key={item.id} className="p-4 space-y-1 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-gray-900">{item.customerName || 'Unknown customer'}</p>
                    <p className="text-gray-500">{item.timestamp || item.serviceDate || ''}</p>
                  </div>
                  <p className="text-gray-700">
                    {item.email || 'No email'} {item.phone ? `• ${item.phone}` : ''}
                  </p>
                  {item.address ? <p className="text-gray-600">{item.address}</p> : null}
                  {item.notes ? <p className="text-gray-600">Notes: {item.notes}</p> : null}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
