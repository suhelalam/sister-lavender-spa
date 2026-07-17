export const legacySlugifyServiceValue = (value = '') =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');

export const slugifyServiceValue = (value = '') =>
  legacySlugifyServiceValue(value)
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

export const normalizeServiceIds = (rawValue) => {
  if (!rawValue) return [];

  const values = Array.isArray(rawValue) ? rawValue : [rawValue];

  return values
    .flatMap((value) => String(value).split(',').map((part) => part.trim()))
    .filter(Boolean);
};

export const getServiceIdsFromCountQuery = (query = {}) =>
  Object.entries(query).flatMap(([key, rawCount]) => {
    if (!key.endsWith('-count')) return [];

    const slug = key.slice(0, -'-count'.length);
    const countValue = Array.isArray(rawCount) ? rawCount[0] : rawCount;
    const count = Number.parseInt(countValue, 10);

    if (!slug || !Number.isFinite(count) || count < 1) return [];

    // Keep malformed shared links from creating an excessive cart quantity.
    return Array(Math.min(count, 99)).fill(slug);
  });

export const getServiceIdsFromRouter = (router) => {
  const idsFromQuery = normalizeServiceIds(router?.query?.services || router?.query?.service);
  if (idsFromQuery.length > 0) return idsFromQuery;

  const rawSlug = router?.query?.slug || router?.query?.service;
  if (rawSlug && rawSlug !== 'services') {
    return normalizeServiceIds(rawSlug);
  }

  const pathnameParts = String(router?.pathname || '').split('/').filter(Boolean);
  const lastPart = pathnameParts[pathnameParts.length - 1];
  if (lastPart && lastPart !== 'services') {
    return normalizeServiceIds(lastPart);
  }

  return [];
};

export const buildServiceLink = ({ router, serviceIds = [] }) => {
  const ids = Array.from(new Set(serviceIds.filter(Boolean)));

  if (ids.length === 0) {
    return {
      pathname: router?.pathname || '/services',
      query: {},
    };
  }

  if (ids.length === 1) {
    const firstId = ids[0];
    const slug = slugifyServiceValue(firstId);
    return {
      pathname: '/services',
      query: { service: slug },
    };
  }

  return {
    pathname: '/services',
    query: { services: ids.join(',') },
  };
};
