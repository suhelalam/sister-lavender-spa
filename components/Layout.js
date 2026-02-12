'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Menu, X, ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext'; // adjust path if needed
import { defaultBusinessHours } from '../lib/homeSettings';

// Client-only cart button to prevent hydration mismatch on badge
function ClientOnlyCartButton({ totalItems, onClick }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return (
    <button onClick={onClick} aria-label="Toggle cart" className="relative">
      <ShoppingCart size={28} />
      {hasMounted && totalItems > 0 && (
        <span className="absolute -top-2 -right-2 bg-purple-600 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
          {totalItems}
        </span>
      )}
    </button>
  );
}

// Client-only checkout button to avoid hydration errors for checkout link
function ClientOnlyCheckoutButton({ items, onClick }) {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);
  if (!hasMounted) return null;

  return (
    <Link
      href="/booking"
      onClick={onClick}
      className={`bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 ${
        items.length === 0 ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      Checkout
    </Link>
  );
}

export default function Layout({ children }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [footerHours, setFooterHours] = useState(defaultBusinessHours);
  const { items, totalItems, removeItem, clearCart } = useCart();

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Services', href: '/services' },
    { label: 'Gift Card', href: '/gift-card' },
    { label: 'Location', href: '/location' },
    { label: 'Our Policy', href: '/our-policy' },
  ];

  useEffect(() => {
    const loadFooterHours = async () => {
      try {
        const response = await fetch('/api/admin/settings');
        if (!response.ok) return;
        const payload = await response.json();
        if (Array.isArray(payload?.settings?.businessHours)) {
          setFooterHours(payload.settings.businessHours);
        }
      } catch (error) {
        console.error('Failed to load footer hours:', error);
      }
    };

    loadFooterHours();
  }, []);

  const formatTime = (time24) => {
    if (!time24 || !time24.includes(':')) return time24;
    const [hourRaw, minute] = time24.split(':');
    const hour = Number(hourRaw);
    if (Number.isNaN(hour)) return time24;
    const period = hour >= 12 ? 'PM' : 'AM';
    const normalizedHour = hour % 12 || 12;
    return `${normalizedHour}:${minute} ${period}`;
  };

  const dayShort = {
    Monday: 'Mon',
    Tuesday: 'Tue',
    Wednesday: 'Wed',
    Thursday: 'Thu',
    Friday: 'Fri',
    Saturday: 'Sat',
    Sunday: 'Sun',
  };

  const toScheduleKey = (entry) => {
    if (entry.closed) return 'closed';
    return `${entry.open}-${entry.close}`;
  };

  const groupHoursForFooter = (hours) => {
    if (!Array.isArray(hours) || hours.length === 0) return [];
    const openGroups = [];
    const closedDays = [];

    for (const entry of hours) {
      if (entry.closed) {
        closedDays.push(entry.day);
        continue;
      }

      const key = toScheduleKey(entry);
      const prev = openGroups[openGroups.length - 1];
      if (prev && prev.key === key) {
        prev.days.push(entry.day);
      } else {
        openGroups.push({ key, days: [entry.day], entry });
      }
    }

    const openLines = openGroups.map((group) => {
      const firstDay = dayShort[group.days[0]] || group.days[0];
      const lastDay = dayShort[group.days[group.days.length - 1]] || group.days[group.days.length - 1];
      const dayLabel = group.days.length > 1 ? `${firstDay}-${lastDay}` : firstDay;

      return {
        dayLabel,
        value: `${formatTime(group.entry.open)} - ${formatTime(group.entry.close)}`,
        closed: false,
      };
    });

    const closedLines = closedDays.map((day) => ({
      dayLabel: dayShort[day] || day,
      value: 'Closed',
      closed: true,
    }));

    return [...openLines, ...closedLines];
  };

  const groupedFooterHours = groupHoursForFooter(footerHours);

  return (
    <>
      <header className="bg-white shadow-md px-4 md:px-8 py-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-bold hover:text-purple-600 transition">
            Sister Lavender Spa
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex space-x-6 items-center">
            {navItems.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className={`hover:text-purple-600 transition font-medium ${
                  (href === '/' ? pathname === '/' : pathname.startsWith(href))
                    ? 'text-purple-600 underline underline-offset-4'
                    : ''
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Desktop Book Now + Cart */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/booking"
              className="bg-purple-600 text-white px-4 py-2 rounded-full font-medium hover:bg-purple-700"
            >
              Book Now
            </Link>

            {/* Cart Icon */}
            <ClientOnlyCartButton
              totalItems={totalItems}
              onClick={() => setCartOpen(!cartOpen)}
            />
          </div>

          {/* Mobile cart + menu */}
          <div className="md:hidden flex items-center space-x-4">
            {/* Cart Icon */}
            <ClientOnlyCartButton
              totalItems={totalItems}
              onClick={() => setCartOpen(!cartOpen)}
            />

            {/* Mobile menu toggle */}
            <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
              {menuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <nav className="md:hidden mt-4 px-4 space-y-4">
            {navItems.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`block font-medium ${
                  pathname.startsWith(href) ? 'text-purple-600 underline' : ''
                }`}
              >
                {label}
              </Link>
            ))}
            <Link
              href="/booking"
              onClick={() => setMenuOpen(false)}
              className="block mt-2 bg-purple-600 text-white px-4 py-2 rounded-full text-center"
            >
              Book Now
            </Link>
          </nav>
        )}

        {/* Cart Sidebar */}
        {cartOpen && (
          <div className="fixed top-0 right-0 w-80 h-full bg-white shadow-lg p-6 z-50 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Your Cart</h2>
              <button onClick={() => setCartOpen(false)} aria-label="Close cart">
                <X size={24} />
              </button>
            </div>

            {items.length === 0 ? (
              <p className="text-center text-gray-500">Your cart is empty.</p>
            ) : (
              <ul className="flex-grow overflow-auto space-y-4">
                {items.map((item) => (
                  <li key={item.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-500 hover:underline text-sm"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => clearCart()}
                className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
                disabled={items.length === 0}
              >
                Clear Cart
              </button>

              {/* Client-only checkout button */}
              <ClientOnlyCheckoutButton items={items} onClick={() => setCartOpen(false)} />
            </div>
          </div>
        )}
      </header>

      <main className="page-container min-h-screen">{children}</main>

      <footer className="bg-gray-100 text-gray-700 mt-12 px-6 py-10 text-sm">
        <div className="max-w-5xl mx-auto grid gap-8 md:grid-cols-3">
          <div>
            <h4 className="font-semibold text-lg mb-2">Contact</h4>
            <p>Email: selena@sisterlavenderspa.com</p>
            <p>Phone: (312) 900-3131</p>
          </div>
          <div>
            <h4 className="font-semibold text-lg mb-2">Business Hours</h4>
            {groupedFooterHours.map((entry) => (
              <p key={entry.dayLabel} className={`flex ${entry.closed ? 'text-red-600 font-medium' : ''}`}>
                <span className="w-24 font-semibold">{entry.dayLabel}:</span>
                <span>{entry.value}</span>
              </p>
            ))}
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-2">Follow Us</h4>
            <p>
              <a
                href="https://www.instagram.com/sisterlavenderspa/"
                className="text-purple-700 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram
              </a>
              <br />
            </p>
            <p className="mt-2">2706 W Chicago Ave, Chicago, Ave, IL 60622</p>
          </div>
        </div>
        <p className="text-center mt-8 text-xs">&copy; {new Date().getFullYear()} Sister Lavender Spa. All rights reserved.</p>
        <p className="text-center mt-2 text-xs text-gray-500">
          Built by{' '}
          <a
            href="mailto:leofran786@gmail.com"
            className="text-purple-600 hover:underline"
          >
            Leo
          </a>{' '}
          – Need a website? Reach out.
        </p>
      </footer>
    </>
  );
}
