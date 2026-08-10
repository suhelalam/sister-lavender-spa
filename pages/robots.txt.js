export function getServerSideProps({ req, res }) {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const origin = String(configured || `${protocol}://${host}`).replace(/\/$/, '');
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin/',
    'Disallow: /api/',
    'Disallow: /check-in',
    'Disallow: /terminal',
    'Disallow: /checkout',
    'Disallow: /payment',
    'Disallow: /customer',
    `Sitemap: ${origin}/sitemap.xml`,
  ].join('\n');
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.write(body);
  res.end();
  return { props: {} };
}

export default function Robots() { return null; }
