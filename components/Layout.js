'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Menu, X, ShoppingCart, MapPin, Phone } from 'lucide-react';
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
      href="/select-time"
      onClick={onClick}
      className={`bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 ${
        items.length === 0 ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      Continue
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
    { label: 'Services & Pricing', href: '/services' },
    { label: 'Couples', href: '/couples-services' },
    { label: 'Rewards', href: '/membership-rewards' },
    { label: 'Gift Cards', href: '/gift-card' },
    { label: 'Visit', href: '/location' },
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

  useEffect(() => {
    if (!cartOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setCartOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [cartOpen]);

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
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div className="top-strip"><span>Open daily 9:30 AM–9:00 PM</span><a href="tel:+13129003131"><Phone size={13}/> (312) 900-3131</a><a href="https://maps.google.com/?q=2706+W+Chicago+Ave+Chicago+IL+60622"><MapPin size={13}/> West Town, Chicago</a></div>
      <header className="site-header px-4 md:px-8 py-3 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="brand-mark">
            <span>Sister Lavender</span><small>SPA · CHICAGO</small>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex space-x-5 items-center">
            {navItems.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className={`nav-link ${
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
          <div className="hidden lg:flex items-center space-x-4">
            <Link
              href="/services"
              className="button-primary"
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
          <div className="lg:hidden flex items-center space-x-4">
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
          <nav className="lg:hidden mt-4 px-4 space-y-4">
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
              href="/services"
              onClick={() => setMenuOpen(false)}
              className="block mt-2 bg-purple-600 text-white px-4 py-2 rounded-full text-center"
            >
              Book Now
            </Link>
          </nav>
        )}

      </header>

      {cartOpen && (
        <div className="fixed inset-0 z-[80]" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-stone-950/45 backdrop-blur-[2px]"
            onClick={() => setCartOpen(false)}
            aria-label="Close cart"
          />
          <aside
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-[#fbfaf7] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-stone-200 px-5 py-5 sm:px-7">
              <div>
                <p className="eyebrow">Your selections</p>
                <h2 id="cart-title" className="mt-1 text-2xl font-semibold text-[#423846]">Your Cart</h2>
              </div>
              <button type="button" onClick={() => setCartOpen(false)} aria-label="Close cart" className="rounded-full p-2 hover:bg-stone-100">
                <X size={24} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
              {items.length === 0 ? (
                <div className="grid min-h-52 place-items-center text-center">
                  <div><ShoppingCart className="mx-auto text-stone-300" size={38} /><p className="mt-3 text-stone-500">Your cart is empty.</p></div>
                </div>
              ) : (
                <ul className="space-y-3">
                  {items.map((item) => (
                    <li key={item.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="break-words font-semibold leading-5 text-stone-800">{item.name}</p>
                          {item.variationName && <p className="mt-1 text-sm text-stone-500">{item.variationName}</p>}
                          <p className="mt-2 text-sm font-semibold text-[#66516f]">${((Number(item.price) || 0) / 100).toFixed(2)} × {item.quantity || 1}</p>
                        </div>
                        <button type="button" onClick={() => removeItem(item.id)} className="shrink-0 text-sm font-semibold text-red-600 hover:underline" aria-label={`Remove one ${item.name} from cart`}>
                          Remove one
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="shrink-0 border-t border-stone-200 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-7">
              {items.length > 0 && <div className="mb-4 flex items-center justify-between text-sm"><span className="text-stone-500">Services selected</span><strong>{totalItems}</strong></div>}
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={clearCart} className="button-secondary flex-1" disabled={items.length === 0}>Clear cart</button>
                <ClientOnlyCheckoutButton items={items} onClick={() => setCartOpen(false)} />
              </div>
            </div>
          </aside>
        </div>
      )}

      <main id="main-content" tabIndex={-1} className="min-h-screen">
        {children}
      </main>

      <footer className="site-footer px-6 py-12 text-sm">
        <div className="max-w-5xl mx-auto grid gap-8 md:grid-cols-3">
          <div>
            <h4 className="font-semibold text-lg mb-2">Contact</h4>
            <p>2706 W Chicago Ave<br/>Chicago, IL 60622</p><p className="mt-2">selena@sisterlavenderspa.com<br/>(312) 900-3131</p>
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
