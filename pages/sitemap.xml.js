const routes = [
  ['/', 'weekly', '1.0'],
  ['/services', 'weekly', '0.9'],
  ['/services/best-sellers', 'daily', '0.9'],
  ['/services/head-spa', 'weekly', '0.8'],
  ['/services/body-massage', 'weekly', '0.8'],
  ['/services/manicure', 'weekly', '0.8'],
  ['/services/foot-care', 'weekly', '0.8'],
  ['/couples-services', 'weekly', '0.8'],
  ['/booking', 'weekly', '0.9'],
  ['/gift-card', 'monthly', '0.7'],
  ['/group-events', 'monthly', '0.7'],
  ['/membership-rewards', 'monthly', '0.6'],
  ['/location', 'monthly', '0.8'],
  ['/about', 'monthly', '0.6'],
  ['/our-policy', 'yearly', '0.3'],
  ['/service-agreement', 'yearly', '0.3'],
];

const escapeXml = (value = '') => String(value).replace(/[<>&'\"]/g, (character) => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', "'":'&apos;', '"':'&quot;' }[character]));

export function getServerSideProps({ req, res }) {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const origin = String(configured || `${protocol}://${host}`).replace(/\/$/, '');
  const urls = routes.map(([path, changefreq, priority]) => `<url><loc>${escapeXml(`${origin}${path}`)}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`).join('');
  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.write(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
  res.end();
  return { props: {} };
}

export default function Sitemap() { return null; }
