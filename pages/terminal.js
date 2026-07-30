// pages/terminal.js
import dynamic from 'next/dynamic';

// The in-store terminal is an interactive, browser-only tool. Rendering it only
// after the browser mounts avoids Safari hydration mismatches while the live
// Stripe product and reader data is loading.
const StripeTerminal = dynamic(() => import('../components/StripeTerminal'), {
  ssr: false,
  loading: () => (
    <div className="mx-auto max-w-3xl rounded-lg border bg-white p-6 text-sm text-stone-600">
      Loading terminal…
    </div>
  ),
});

export default function TerminalPage() {
  return (
    <div className="terminal-page bg-gray-50 py-2 sm:py-3">
      <div className="terminal-page-inner mx-auto w-full px-2 sm:px-3">
        <StripeTerminal />
      </div>
    </div>
  );
}
