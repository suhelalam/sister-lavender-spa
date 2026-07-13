export const slugifyServiceValue = (value = '') =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');

export const normalizeServiceIds = (rawValue) => {
  if (!rawValue) return [];

  const values = Array.isArray(rawValue) ? rawValue : [rawValue];

  return values
    .flatMap((value) => String(value).split(',').map((part) => part.trim()))
    .filter(Boolean);
};

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
      pathname: '/services',
      query: {},
    };
  }

  if (ids.length === 1) {
    const firstId = ids[0];
    const slug = slugifyServiceValue(firstId);

    if (router?.pathname && router.pathname.startsWith('/services/')) {
      return {
        pathname: router.pathname,
        query: {},
      };
    }

    return {
      pathname: `/services/${slug}`,
      query: {},
    };
  }

  return {
    pathname: '/services',
    query: { services: ids.join(',') },
  };
};
