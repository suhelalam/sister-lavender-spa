import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/router';
import { auth } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const toDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const startOfWeek = (date) => {
  const d = startOfDay(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
};
const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const dateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const weekKey = (date) => dateKey(startOfWeek(date));
const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

function buildCheckinAnalytics(checkinsRaw) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const checkins = checkinsRaw
    .map((item) => ({
      ...item,
      date: toDate(item.timestamp || item.serviceDate),
    }))
    .filter((item) => item.date);

  const totalCheckins = checkins.length;
  const todayCount = checkins.filter((item) => item.date >= todayStart).length;
  const weekCount = checkins.filter((item) => item.date >= weekStart).length;
  const monthCount = checkins.filter((item) => item.date >= monthStart).length;

  const uniqueCustomerKeys = new Set(
    checkins.map((item) => {
      const email = String(item.email || '').trim().toLowerCase();
      const phone = String(item.phone || '').trim();
      const name = String(item.customerName || '').trim().toLowerCase();
      return email || phone || name || item.id;
    })
  );

  const byDayMap = new Map();
  const byWeekMap = new Map();
  const byMonthMap = new Map();
  const weekdayMap = new Map(WEEKDAY_LABELS.map((label) => [label, 0]));

  checkins.forEach((item) => {
    const day = item.date;
    const dKey = dateKey(day);
    const wKey = weekKey(day);
    const mKey = monthKey(day);
    const weekday = WEEKDAY_LABELS[day.getDay()];

    byDayMap.set(dKey, (byDayMap.get(dKey) || 0) + 1);
    byWeekMap.set(wKey, (byWeekMap.get(wKey) || 0) + 1);
    byMonthMap.set(mKey, (byMonthMap.get(mKey) || 0) + 1);
    weekdayMap.set(weekday, (weekdayMap.get(weekday) || 0) + 1);
  });

  const daySeries = Array.from(byDayMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14)
    .map(([label, value]) => ({ label, value }));

  const weekSeries = Array.from(byWeekMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-8)
    .map(([label, value]) => ({ label, value }));

  const monthSeries = Array.from(byMonthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([label, value]) => ({ label, value }));

  const weekdayDistribution = Array.from(weekdayMap.entries()).map(([label, value]) => ({
    label,
    value,
  }));

  const busiestDay = weekdayDistribution.reduce(
    (max, entry) => (entry.value > max.value ? entry : max),
    { label: '-', value: 0 }
  );

  return {
    metrics: {
      totalCheckins,
      todayCount,
      weekCount,
      monthCount,
      uniqueCustomers: uniqueCustomerKeys.size,
      busiestDay,
    },
    charts: {
      daySeries,
      weekSeries,
      monthSeries,
      weekdayDistribution,
    },
    sources: {
      checkinsCount: totalCheckins,
    },
  };
}

function buildBookedServicesAnalytics(bookingsRaw) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const bookings = bookingsRaw
    .map((item) => ({
      ...item,
      date: toDate(item.bookedAt || item.startAt),
      services: Array.isArray(item.services) ? item.services : [],
    }))
    .filter((item) => item.date);

  const bookingsToday = bookings.filter((item) => item.date >= todayStart).length;
  const bookingsWeek = bookings.filter((item) => item.date >= weekStart).length;
  const bookingsMonth = bookings.filter((item) => item.date >= monthStart).length;
  const unitsToday = bookings
    .filter((item) => item.date >= todayStart)
    .reduce(
      (sum, booking) =>
        sum +
        booking.services.reduce((inner, service) => inner + Math.max(1, Number(service?.quantity || 1)), 0),
      0
    );
  const unitsWeek = bookings
    .filter((item) => item.date >= weekStart)
    .reduce(
      (sum, booking) =>
        sum +
        booking.services.reduce((inner, service) => inner + Math.max(1, Number(service?.quantity || 1)), 0),
      0
    );
  const unitsMonth = bookings
    .filter((item) => item.date >= monthStart)
    .reduce(
      (sum, booking) =>
        sum +
        booking.services.reduce((inner, service) => inner + Math.max(1, Number(service?.quantity || 1)), 0),
      0
    );

  const serviceCountMap = new Map();
  const byDayMap = new Map();
  let totalServiceUnits = 0;

  bookings.forEach((booking) => {
    const dKey = dateKey(booking.date);
    byDayMap.set(dKey, (byDayMap.get(dKey) || 0) + 1);

    booking.services.forEach((service) => {
      const name = String(service?.serviceName || service?.serviceVariationId || '').trim();
      const quantity = Math.max(1, Number(service?.quantity || 1));
      if (!name) return;
      serviceCountMap.set(name, (serviceCountMap.get(name) || 0) + quantity);
      totalServiceUnits += quantity;
    });
  });

  const topBookedServices = Array.from(serviceCountMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const bookingTrend = Array.from(byDayMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14)
    .map(([label, value]) => ({ label, value }));

  return {
    metrics: {
      bookingsToday,
      bookingsWeek,
      bookingsMonth,
      unitsToday,
      unitsWeek,
      unitsMonth,
      totalBookings: bookings.length,
      totalServiceUnits,
    },
    charts: {
      bookingTrend,
    },
    topBookedServices,
    sources: {
      bookingsAnalyzed: bookings.length,
    },
  };
}

function MetricCard({ label, value }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function MiniBarChart({ title, data }) {
  const maxValue = useMemo(
    () => Math.max(1, ...((data || []).map((d) => Number(d.value || 0)))),
    [data]
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="font-semibold text-gray-800 mb-3">{title}</h3>
      {data?.length ? (
        <div className="space-y-2">
          {data.map((entry) => (
            <div key={entry.label}>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>{entry.label}</span>
                <span>{entry.value}</span>
              </div>
              <div className="h-2 rounded bg-gray-100 overflow-hidden">
                <div
                  className="h-2 bg-purple-500"
                  style={{ width: `${Math.round((entry.value / maxValue) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No data yet.</p>
      )}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('today');
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

    const loadAnalytics = async () => {
      setLoading(true);
      setError('');
      setWarnings([]);
      try {
        const [checkinsResult, bookingsResult, stripeResult] = await Promise.allSettled([
          getDocs(collection(db, 'checkins')),
          getDocs(collection(db, 'bookingAnalytics')),
          fetch('/api/admin/analytics'),
        ]);

        const nextWarnings = [];
        let stripePayload = { topServices: [], sources: { paymentIntentsScanned: 0 } };
        let checkinAnalytics = buildCheckinAnalytics([]);
        let bookingAnalytics = buildBookedServicesAnalytics([]);

        if (checkinsResult.status === 'fulfilled') {
          const checkinsRaw = checkinsResult.value.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          checkinAnalytics = buildCheckinAnalytics(checkinsRaw);
        } else {
          nextWarnings.push(
            'Check-ins analytics unavailable due to Firestore permissions.'
          );
        }

        if (bookingsResult.status === 'fulfilled') {
          const bookingsRaw = bookingsResult.value.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          bookingAnalytics = buildBookedServicesAnalytics(bookingsRaw);
        } else {
          nextWarnings.push(
            'Booked-services analytics unavailable due to Firestore permissions.'
          );
        }

        if (stripeResult.status === 'fulfilled') {
          if (stripeResult.value.ok) {
            stripePayload = await stripeResult.value.json();
          } else {
            nextWarnings.push('Stripe terminal analytics unavailable right now.');
          }
        } else {
          nextWarnings.push('Stripe terminal analytics unavailable right now.');
        }

        setAnalytics({
          ...stripePayload,
          ...checkinAnalytics,
          bookedServices: bookingAnalytics,
          sources: {
            ...checkinAnalytics.sources,
            ...bookingAnalytics.sources,
            ...stripePayload.sources,
          },
        });
        setWarnings(nextWarnings);

        if (
          nextWarnings.length >= 3 &&
          !checkinAnalytics.sources.checkinsCount &&
          !bookingAnalytics.sources.bookingsAnalyzed &&
          !stripePayload.sources.paymentIntentsScanned
        ) {
          setError('Unable to load analytics data sources.');
        }
      } catch (err) {
        console.error('Failed to load analytics:', err);
        setError(String(err?.message || err || 'Failed to load analytics'));
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [loadingAuth]);

  if (loadingAuth) return <p className="text-center mt-10">Checking authentication...</p>;

  const metrics = analytics?.metrics || {};
  const charts = analytics?.charts || {};
  const topServices = analytics?.topServices || [];
  const bookedMetrics = analytics?.bookedServices?.metrics || {};
  const bookedCharts = analytics?.bookedServices?.charts || {};
  const topBookedServices = analytics?.bookedServices?.topBookedServices || [];
  const periods = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'total', label: 'Total' },
  ];
  const customerCountByPeriod = {
    today: metrics.todayCount || 0,
    week: metrics.weekCount || 0,
    month: metrics.monthCount || 0,
    total: metrics.totalCheckins || 0,
  };
  const bookingCountByPeriod = {
    today: bookedMetrics.bookingsToday || 0,
    week: bookedMetrics.bookingsWeek || 0,
    month: bookedMetrics.bookingsMonth || 0,
    total: bookedMetrics.totalBookings || 0,
  };
  const serviceUnitsByPeriod = {
    today: bookedMetrics.unitsToday || 0,
    week: bookedMetrics.unitsWeek || 0,
    month: bookedMetrics.unitsMonth || 0,
    total: bookedMetrics.totalServiceUnits || 0,
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Customer trends and service performance</p>
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

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-gray-600">Loading analytics...</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">{error}</div>
      ) : (
        <>
          {warnings.length > 0 ? (
            <section className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800 text-sm">
              {warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </section>
          ) : null}

          <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              {periods.map((period) => (
                <button
                  key={period.key}
                  type="button"
                  onClick={() => setSelectedPeriod(period.key)}
                  className={`px-3 py-1.5 rounded text-sm border transition ${
                    selectedPeriod === period.key
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Customers (Check-ins)" value={customerCountByPeriod[selectedPeriod]} />
              <MetricCard label="Bookings" value={bookingCountByPeriod[selectedPeriod]} />
              <MetricCard label="Services Booked" value={serviceUnitsByPeriod[selectedPeriod]} />
              <MetricCard label="Unique Customers (All Time)" value={metrics.uniqueCustomers || 0} />
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <MiniBarChart title="Daily Trend (Last 14 Days)" data={charts.daySeries} />
            <MiniBarChart title="Weekly Trend (Last 8 Weeks)" data={charts.weekSeries} />
            <MiniBarChart title="Monthly Trend (Last 12 Months)" data={charts.monthSeries} />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MiniBarChart title="Booking Trend (Last 14 Days)" data={bookedCharts.bookingTrend} />
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Top Services Booked</h3>
              {topBookedServices.length ? (
                <div className="space-y-2">
                  {topBookedServices.map((service, idx) => (
                    <div key={service.name} className="flex justify-between border-b pb-2 text-sm">
                      <span>{idx + 1}. {service.name}</span>
                      <span className="font-semibold">{service.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No booking analytics data yet.</p>
              )}
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MiniBarChart title="Busiest Weekdays" data={charts.weekdayDistribution} />

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Top Services (Paid Terminal Transactions)</h3>
              {topServices.length ? (
                <div className="space-y-2">
                  {topServices.map((service, idx) => (
                    <div key={service.name} className="flex justify-between border-b pb-2 text-sm">
                      <span>{idx + 1}. {service.name}</span>
                      <span className="font-semibold">{service.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No terminal service usage data yet.
                </p>
              )}
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
            <p>Sources:</p>
            <p>Check-ins analyzed: {analytics?.sources?.checkinsCount || 0}</p>
            <p>Bookings analyzed: {analytics?.sources?.bookingsAnalyzed || 0}</p>
            <p>Successful terminal payments analyzed: {analytics?.sources?.paymentIntentsScanned || 0}</p>
            <p className="mt-2">Busiest day: {metrics?.busiestDay?.label || '-'} ({metrics?.busiestDay?.value || 0})</p>
          </section>
        </>
      )}
    </div>
  );
}
