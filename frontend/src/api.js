export class ApiError extends Error {
  constructor(status, payload, retryAfter) {
    super(payload?.message || 'Unable to complete the request. Please try again.');
    this.status = status;
    this.code = payload?.code;
    this.fields = payload?.details?.fields ?? {};
    this.retryAfter = retryAfter;
  }
}

export function createClient(fetcher = fetch) {
  let csrf;
  let bootstrap;
  async function send(path, { method = 'GET', body, signal } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (method !== 'GET') {
      if (!csrf) {
        bootstrap ??= send('/auth/csrf').then(data => { csrf = data.csrfToken; }).finally(() => { bootstrap = undefined; });
        await bootstrap;
      }
      headers['x-csrf-token'] = csrf;
    }
    const response = await fetcher('/api/v1' + path, {
      credentials: 'include', method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal,
    });
    if (response.status === 204) {
      if (path === '/auth/logout') csrf = undefined;
      return;
    }
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) csrf = undefined;
      if (path !== '/auth/login' && path !== '/auth/me' && typeof window !== 'undefined') {
        if (response.status === 401) window.dispatchEvent(new Event('unicircle:unauthorized'));
        if (result?.error?.code === 'NOT_VERIFIED') window.dispatchEvent(new Event('unicircle:not-verified'));
      }
      throw new ApiError(response.status, result?.error, response.headers.get('Retry-After'));
    }
    if (!result || !Object.hasOwn(result, 'data')) throw new ApiError(502, { message: 'Unexpected response from the API.' });
    if (path === '/auth/login') csrf = result.data.csrfToken;
    if (path === '/auth/reset-password') csrf = undefined;
    return result.data;
  }
  return send;
}

const transport = import.meta.env?.DEV && import.meta.env.VITE_MOCK_API === '1'
  ? import('./mocks/api.js').then(module => module.mockFetch)
  : null;
export const api = createClient((...args) => transport ? transport.then(mock => mock(...args)) : fetch(...args));

export const types = { sell: 'Sell', rent: 'Rent', exchange: 'Exchange', donate: 'Donate', free_borrowing: 'Free Borrowing' };
export const conditions = { new: 'New', like_new: 'Like new', good: 'Good', fair: 'Fair', poor: 'Poor' };
export const temporary = type => type === 'rent' || type === 'free_borrowing';
export const actionPath = (id, action) => '/requests/' + encodeURIComponent(id) + '/' + action;
export const eligible = (item, user) => item.owner?.id === user.id && item.status === 'available' && !item.isHidden;
export const money = item => item.listingType === 'exchange' ? 'Swap' : Number(item.amountBdt) === 0
  ? 'Free' : '৳' + item.amountBdt + (item.listingType === 'rent' ? ' / day' : '');
export const campusToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());

export function query(path, values = {}) {
  const params = new URLSearchParams(Object.entries(values).filter(([, v]) => v !== '' && v != null));
  return params.size ? path + '?' + params : path;
}

export function decimalAmount(value) {
  const match = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const normalized = Number(match[1]) + '.' + (match[2] ?? '').padEnd(2, '0');
  return normalized === '0.00' ? null : normalized;
}
