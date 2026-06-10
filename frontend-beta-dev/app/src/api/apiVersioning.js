const DOMAIN_VERSION_REGISTRY = {
    triplistsCollaborators: { base: '/api/triplists/collaborators', version: 'v1' },
    chatUnreadCount: { base: '/api/chat/unread-count', version: 'v1' },
    chatDirect: { base: '/api/chat/direct', version: 'v1' },
    chatRead: { base: '/api/chat/read', version: 'v1' },
    triplists: { base: '/api/triplists', version: 'v1' },
    places: { base: '/api/places', version: 'v1' },
    search: { base: '/api/search', version: 'v1' },
    users: { base: '/api/users', version: 'v1' },
    follows: { base: '/api/follows', version: 'v1' },
    drafts: { base: '/api/drafts', version: 'v1' },
    notifications: { base: '/api/notifications', version: 'v1' },
    chat: { base: '/api/chat', version: 'v1' },
    rooms: { base: '/api/rooms', version: 'v1' },
    devices: { base: '/api/devices', version: 'v1' },
    reviews: { base: '/api/reviews', version: 'v1' },
    highlights: { base: '/api/highlights', version: 'v1' },
    images: { base: '/api/images', version: 'v1' },
    like: { base: '/api/like', version: 'v1' },
    community: { base: '/api/community', version: 'v1' },
    media: { base: '/api/media', version: 'v1' },
    categories: { base: '/api/categories', version: 'v1' },
    biometric: { base: '/api/biometric', version: 'v1' },
    instagram: { base: '/api/instagram', version: 'v1' },
    userPoints: { base: '/api/userPoints', version: 'v1' },
    quests: { base: '/api/quests', version: 'v1' },
    theme: { base: '/api/theme', version: 'v1' },
    tnc: { base: '/api/tnc', version: 'v1' },
    blocks: { base: '/api/blocks', version: 'v1' },
    reports: { base: '/api/reports', version: 'v1' },
    hotels: { base: '/api/hotels', version: 'v1' },
    flights: { base: '/api/flights', version: 'v1' },
    bookings: { base: '/api/bookings', version: 'v1' },
    paymentMethods: { base: '/api/payment-methods', version: 'v1' },
};

const ROOT_VERSIONED_ENDPOINTS = {
    '/api/refresh': '/api/v1/refresh',
    '/api/signup': '/api/v1/signup',
    '/api/verify': '/api/v1/verify',
    '/api/update-fcm-token': '/api/v1/update-fcm-token',
};

const SORTED_DOMAIN_ENTRIES = Object.entries(DOMAIN_VERSION_REGISTRY)
    .sort(([, a], [, b]) => b.base.length - a.base.length);

const normalizeSuffix = (suffix = '') => {
    if (!suffix) return '';
    return suffix.startsWith('/') ? suffix : `/${suffix}`;
};

export const getApiDomainVersion = (domainKey) => DOMAIN_VERSION_REGISTRY[domainKey]?.version || null;

export const buildApiPath = (domainKey, suffix = '') => {
    const domain = DOMAIN_VERSION_REGISTRY[domainKey];
    if (!domain) {
        throw new Error(`Unknown API domain key: ${domainKey}`);
    }
    return `${domain.base}/${domain.version}${normalizeSuffix(suffix)}`;
};

export const buildRootVersionedPath = (legacyPath) => {
    if (!ROOT_VERSIONED_ENDPOINTS[legacyPath]) {
        throw new Error(`Unknown root versioned path: ${legacyPath}`);
    }
    return ROOT_VERSIONED_ENDPOINTS[legacyPath];
};

const splitUrl = (url) => {
    const hashIndex = url.indexOf('#');
    const queryIndex = url.indexOf('?');
    let cut = -1;
    if (hashIndex >= 0 && queryIndex >= 0) {
        cut = Math.min(hashIndex, queryIndex);
    } else {
        cut = Math.max(hashIndex, queryIndex);
    }

    if (cut < 0) return { path: url, tail: '' };
    return { path: url.slice(0, cut), tail: url.slice(cut) };
};

const isAlreadyVersioned = (path) => {
    if (/^\/api\/v\d+(\/|$)/.test(path)) return true;
    return SORTED_DOMAIN_ENTRIES.some(([, domain]) => path === `${domain.base}/${domain.version}` || path.startsWith(`${domain.base}/${domain.version}/`));
};

export const applyApiVersioning = (url) => {
    if (!url || typeof url !== 'string') return url;
    if (!url.startsWith('/api/')) return url;

    const { path, tail } = splitUrl(url);
    if (isAlreadyVersioned(path)) return url;

    if (ROOT_VERSIONED_ENDPOINTS[path]) {
        return `${ROOT_VERSIONED_ENDPOINTS[path]}${tail}`;
    }

    for (const [, domain] of SORTED_DOMAIN_ENTRIES) {
        if (path === domain.base || path.startsWith(`${domain.base}/`)) {
            const versionedBase = `${domain.base}/${domain.version}`;
            const replacedPath = `${versionedBase}${path.slice(domain.base.length)}`;
            return `${replacedPath}${tail}`;
        }
    }

    return url;
};

export const API_VERSIONING = {
    domains: DOMAIN_VERSION_REGISTRY,
    rootEndpoints: ROOT_VERSIONED_ENDPOINTS,
};

