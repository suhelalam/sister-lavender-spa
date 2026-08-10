import Head from 'next/head';

const SITE_NAME = 'Sister Lavender Spa';
const DEFAULT_DESCRIPTION = 'Relax and rejuvenate at Sister Lavender Spa in Chicago with professional head spa treatments, therapeutic massages, and expert nail services.';
const DEFAULT_ROBOTS = 'index,follow,max-image-preview:large';
const DEFAULT_IMAGE = '/images/Firefly_Full-body spa ritual scene combining head and body massage. A tranquil environment wi 864039.jpg';

function normalizeSiteUrl(url = '') {
  return String(url).trim().replace(/\/$/, '');
}

function normalizePath(path = '/') {
  if (!path) return '/';
  const withoutHash = String(path).split('#')[0];
  const withoutQuery = withoutHash.split('?')[0];
  return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
}

function buildTitle(title) {
  if (!title) return SITE_NAME;
  if (title === SITE_NAME || title.endsWith(`| ${SITE_NAME}`)) {
    return title;
  }
  return `${title} | ${SITE_NAME}`;
}

export default function SeoHead({
  title,
  description,
  keywords,
  path = '/',
  image,
  robots = DEFAULT_ROBOTS,
  noIndex = false,
  structuredData,
  structuredDataKey = 'json-ld',
}) {
  const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '');
  const normalizedPath = normalizePath(path);
  const canonicalUrl = siteUrl ? `${siteUrl}${normalizedPath}` : '';
  const resolvedTitle = buildTitle(title);
  const resolvedDescription = description || DEFAULT_DESCRIPTION;
  const robotsValue = noIndex ? 'noindex,nofollow' : robots;
  const resolvedImage = image || DEFAULT_IMAGE;
  const imageUrl = resolvedImage.startsWith('http') ? resolvedImage : (siteUrl ? `${siteUrl}${resolvedImage.startsWith('/') ? resolvedImage : `/${resolvedImage}`}` : resolvedImage);

  return (
    <Head>
      <title key="title">{resolvedTitle}</title>
      <meta key="description" name="description" content={resolvedDescription} />
      {keywords ? <meta key="keywords" name="keywords" content={keywords} /> : null}
      <meta key="robots" name="robots" content={robotsValue} />
      <meta key="og:type" property="og:type" content="website" />
      <meta key="og:locale" property="og:locale" content="en_US" />
      <meta key="og:site_name" property="og:site_name" content={SITE_NAME} />
      <meta key="og:title" property="og:title" content={resolvedTitle} />
      <meta key="og:description" property="og:description" content={resolvedDescription} />
      {canonicalUrl ? <meta key="og:url" property="og:url" content={canonicalUrl} /> : null}
      <meta key="og:image" property="og:image" content={imageUrl} />
      <meta key="og:image:alt" property="og:image:alt" content={`${resolvedTitle} at Sister Lavender Spa in Chicago`} />
      <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
      <meta key="twitter:title" name="twitter:title" content={resolvedTitle} />
      <meta key="twitter:description" name="twitter:description" content={resolvedDescription} />
      <meta key="twitter:image" name="twitter:image" content={imageUrl} />
      {canonicalUrl ? <link key="canonical" rel="canonical" href={canonicalUrl} /> : null}
      <link key="favicon" rel="icon" href="/favicon-96x96.png" />
      {structuredData ? (
        <script
          key={structuredDataKey}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      ) : null}
    </Head>
  );
}
