import { campusToday, temporary } from '../api.js';

const id = value => value.toString(16).padStart(24, '0');
const newId = () => crypto.randomUUID().replaceAll('-', '').slice(0, 24);
const now = () => new Date().toISOString();
const domain = email => email.split('@').at(-1);
const testToken = 'fixture-token-for-local-testing';

export function createMockApi() {
  const categories = [
    ['books_notes', 'Books & Notes'], ['electronics', 'Electronics'], ['stationery', 'Stationery'],
    ['lab_equipment', 'Lab Equipment'], ['furniture', 'Furniture'], ['clothing', 'Clothing'],
    ['sports', 'Sports'], ['other', 'Other'],
  ].map(([code, name], index) => ({ id: id(10 + index), code, name }));
  const domains = [{ id: id(30), domain: 'seu.edu.bd', isActive: true, createdAt: now(), updatedAt: now() }];
  const users = [
    ['member', 'Test Member', 'member', 'verified'],
    ['owner', 'Test Owner', 'member', 'verified'],
    ['admin', 'Test Admin', 'admin', 'verified'],
    ['pending', 'Pending Member', 'member', 'unverified'],
  ].map(([email, name, role, verificationStatus], index) => ({ id: id(index + 1), fullName: name, displayName: name,
    universityEmail: email + '@seu.edu.bd', role, verificationStatus, password: 'LocalTest123!' }));
  const listings = Array.from({ length: 26 }, (_, index) => {
    const type = ['rent', 'sell', 'free_borrowing', 'exchange', 'donate'][index % 5];
    return { id: id(100 + index), title: index === 0 ? 'Scientific calculator' : 'Campus item ' + (index + 1),
      description: 'A sample item for local UI testing.', category: categories[index % categories.length],
      condition: 'good', listingType: type, amountBdt: type === 'exchange' ? null : index % 5 < 2 ? '100.00' : '0.00',
      exchangeTerms: type === 'exchange' ? 'A study lamp' : null, photoUrl: null, owner: publicUser(users[index === 4 ? 0 : 1]),
      status: 'available', isHidden: false, version: 1, createdAt: now(), updatedAt: now() };
  });
  const requests = [];
  const assets = new Map();
  let user = null;
  let csrf = 'local-preauth';
  let verificationUser = users[3];
  let resetUser = users[0];
  const sent = new Map();

  function publicUser({ id, displayName }) { return { id, displayName }; }
  function self({ password, ...data }) { return data; }
  function envelope(data, status = 200) { return Response.json({ data }, { status }); }
  function failure(status, code, message, fields) {
    throw Response.json({ error: { code, message, details: fields ? { fields } : {} } }, {
      status, headers: status === 429 ? { 'Retry-After': '60' } : {},
    });
  }
  const conflict = () => failure(409, 'STATE_CONFLICT', 'The current state has changed. Refresh and try again.');
  const bad = (field, message) => failure(400, 'VALIDATION_ERROR', message, { [field]: message });
  const forbidden = () => failure(403, 'FORBIDDEN', 'You do not have access to do that.');
  const missing = () => failure(404, 'NOT_FOUND', 'The item could not be found.');
  const visible = item => !item.deleted && !item.isHidden && item.status === 'available';
  const owned = item => item.owner.id === user.id;
  const current = email => users.find(entry => entry.universityEmail === email);
  const activeDomain = email => domains.some(entry => entry.domain === domain(email) && entry.isActive);
  const active = request => ['pending', 'accepted', 'checked_out'].includes(request.status);
  function page(rows, params) {
    const start = Number(params.get('cursor') ?? 0);
    const limit = Number(params.get('limit') ?? 20);
    return { items: rows.slice(start, start + limit), nextCursor: start + limit < rows.length ? String(start + limit) : null };
  }
  function detail(item) {
    const { deleted, hiddenReason, ...listing } = item;
    return owned(item) && hiddenReason ? { ...listing, hiddenReason } : listing;
  }
  function summary({ updatedAt, description, isHidden, version, hiddenReason, deleted, ...item }) { return item; }
  function adminListing({ id, title, listingType, status, isHidden, hiddenReason, owner, createdAt }) {
    return { id, title, listingType, status, isHidden, hiddenReason: hiddenReason ?? null, owner, createdAt };
  }
  function cancelPending(item, reason) {
    requests.filter(row => row.listingId === item.id && row.status === 'pending')
      .forEach(row => Object.assign(row, { status: 'cancelled', cancellationReason: reason }));
  }
  function allowResend(email) {
    return (sent.get(email) ?? []).filter(t => t > Date.now() - 3600000).length < 5;
  }

  async function dispatch(path, init) {
    init.signal?.throwIfAborted();
    const url = new URL(path, 'http://mock.invalid');
    const route = url.pathname.slice('/api/v1'.length);
    const params = url.searchParams;
    const method = init.method;
    const body = init.body ? JSON.parse(init.body) : {};
    if (method !== 'GET' && init.headers['x-csrf-token'] !== csrf) failure(403, 'FORBIDDEN', 'Session protection expired. Try again.');
    switch (route) {
      case '/health': return envelope({ status: 'ok' });
      case '/auth/csrf': return envelope({ csrfToken: csrf });
      case '/auth/register': {
        if (!activeDomain(body.universityEmail)) bad('universityEmail', 'Use an approved university email.');
        if (current(body.universityEmail)) failure(409, 'ALREADY_REGISTERED', 'That email is already registered.');
        verificationUser = { ...body, id: newId(), role: 'member', verificationStatus: 'unverified' };
        users.push(verificationUser);
        return envelope({ account: { id: verificationUser.id, verificationStatus: 'unverified' }, emailSent: false }, 201);
      }
      case '/auth/login': {
        const found = current(body.universityEmail);
        if (found?.password !== body.password || !found) failure(401, 'UNAUTHORIZED', 'The email or password is incorrect.');
        user = found;
        csrf = newId();
        return envelope({ user: self(user), csrfToken: csrf });
      }
      case '/auth/verify-email':
        if (body.token !== testToken || !verificationUser || !activeDomain(verificationUser.universityEmail)) failure(400, 'TOKEN_INVALID_OR_EXPIRED', 'Verification link is invalid or expired.');
        verificationUser.verificationStatus = 'verified';
        verificationUser = null;
        return envelope({ verificationStatus: 'verified' });
      case '/auth/resend-verification': {
        const target = current(body.universityEmail);
        if (target?.verificationStatus === 'unverified' && activeDomain(target.universityEmail)) {
          if (!allowResend(target.universityEmail)) failure(429, 'RATE_LIMITED', 'Too many verification requests.');
          const history = (sent.get(target.universityEmail) ?? []).filter(t => t > Date.now() - 3600000);
          sent.set(target.universityEmail, [...history, Date.now()]);
          verificationUser = target;
        }
        return envelope({ message: 'If eligible, a verification email will be sent.' }, 202);
      }
      case '/auth/forgot-password':
        resetUser = current(body.universityEmail) ?? null;
        return envelope({ message: 'If the account exists, a reset email will be sent.' }, 202);
      case '/auth/reset-password':
        if (body.token !== testToken || !resetUser) failure(400, 'TOKEN_INVALID_OR_EXPIRED', 'Reset link is invalid or expired.');
        resetUser.password = body.newPassword;
        if (user?.id === resetUser.id) { user = null; csrf = 'local-preauth'; }
        resetUser = null;
        return envelope({ message: 'Password updated. Please sign in again.' });
    }
    if (!user) failure(401, 'UNAUTHORIZED', 'Sign in to continue.');
    if (route === '/auth/me') return envelope({ user: self(user) });
    if (route === '/auth/logout') { user = null; csrf = 'local-preauth'; return new Response(null, { status: 204 }); }
    if (route === '/verification/status') return envelope({ verificationStatus: user.verificationStatus,
      canResend: user.verificationStatus === 'unverified' && activeDomain(user.universityEmail) && allowResend(user.universityEmail) });
    if (user.verificationStatus !== 'verified') failure(403, 'NOT_VERIFIED', 'Verify your university email first.');
    if (route.startsWith('/admin/') && user.role !== 'admin') forbidden();
    if (route === '/categories') return envelope({ items: categories });
    if (route === '/listings/photos/sign') {
      if (body.sizeBytes > 5242880 || !['image/png', 'image/jpeg', 'image/webp'].includes(body.contentType)) bad('photo', 'Invalid photo.');
      const photoAssetId = newId();
      assets.set(photoAssetId, { owner: user.id });
      return envelope({ upload: { photoAssetId, bucket: 'local', path: photoAssetId, token: 'local', expiresAt: now() } });
    }
    if (route === '/listings/photos/confirm') {
      const asset = assets.get(body.photoAssetId);
      if (asset?.owner !== user.id || !asset.url) conflict();
      asset.verified = true;
      return envelope({ photo: { photoAssetId: body.photoAssetId, secureUrl: asset.url } });
    }

    function save(item) {
      const category = categories.find(entry => entry.id === body.categoryId);
      if (!category) bad('categoryId', 'Choose a category.');
      if (item && (!visible(item) || item.version !== body.version)) conflict();
      const amountBdt = body.listingType === 'exchange' ? null : body.amountBdt ?? '0.00';
      const exchangeTerms = body.listingType === 'exchange' ? body.exchangeTerms : null;
      if (['sell', 'rent'].includes(body.listingType) && !(Number(amountBdt) > 0)) bad('amountBdt', 'Enter a positive amount.');
      const asset = assets.get(body.photoAssetId);
      if (body.photoAssetId && (!asset?.verified || asset.owner !== user.id || asset.attached)) conflict();
      if (item && (item.listingType !== body.listingType || item.amountBdt !== amountBdt || item.exchangeTerms !== exchangeTerms)) cancelPending(item, 'The listing terms changed.');
      const fields = { title: body.title, description: body.description, category, condition: body.condition,
        listingType: body.listingType, amountBdt, exchangeTerms, photoUrl: asset?.url ?? (body.photoAssetId === null ? null : item?.photoUrl ?? null), updatedAt: now() };
      if (asset) asset.attached = true;
      if (item) { Object.assign(item, fields, { version: item.version + 1 }); return envelope({ listing: detail(item) }); }
      const listing = { ...fields, id: newId(), owner: publicUser(user), isHidden: false, status: 'available', version: 1, createdAt: now() };
      listings.unshift(listing);
      return envelope({ listing }, 201);
    }

    if (route === '/listings') {
      if (method === 'POST') return save();
      const q = (params.get('q') ?? '').toLowerCase();
      const filter = listings.filter(item => visible(item) && item.title.toLowerCase().includes(q)
        && (!params.has('category') || item.category.code === params.get('category'))
        && (!params.has('type') || item.listingType === params.get('type'))
        && (params.get('free') !== 'true' || ['donate', 'free_borrowing'].includes(item.listingType)));
      return envelope(page(filter.map(summary), params));
    }
    if (route === '/me/listings') return envelope(page(listings.filter(item => owned(item) && !item.deleted).map(detail), params));
    if (route === '/me/requests/sent') return envelope(page(requests.filter(row => row.requester.id === user.id), params));
    if (route === '/me/requests/received') return envelope(page(requests.filter(row => {
      const item = listings.find(entry => entry.id === row.listingId);
      return owned(item);
    }), params));
    if (route === '/admin/domains') {
      if (method === 'GET') return envelope({ items: domains });
      if (domains.some(entry => entry.domain === body.domain)) failure(409, 'DOMAIN_ALREADY_EXISTS', 'That domain already exists.');
      const entry = { id: newId(), domain: body.domain, isActive: true, createdAt: now(), updatedAt: now() };
      domains.push(entry);
      return envelope({ domain: entry }, 201);
    }
    if (route.startsWith('/admin/domains/')) {
      const entry = domains.find(row => row.id === route.split('/').at(-1));
      if (!entry) missing();
      Object.assign(entry, { isActive: body.isActive, updatedAt: now() });
      return envelope({ domain: entry });
    }
    if (route === '/admin/listings') return envelope(page(listings.filter(item => !item.deleted).map(adminListing), params));

    const listingRoute = /^\/(admin\/)?listings\/([a-f0-9]{24})(?:\/(close|requests|hide))?$/.exec(route);
    if (listingRoute) {
      const [, admin, targetId, action] = listingRoute;
      const item = listings.find(entry => entry.id === targetId);
      if (!item || item.deleted) missing();
      if (admin) {
        if (!action && method === 'GET') return envelope({ listing: adminListing(item) });
        if (action !== 'hide' || method !== 'POST') missing();
        if (item.isHidden) conflict();
        item.isHidden = true;
        item.hiddenReason = body.reason;
        cancelPending(item, 'The listing was hidden.');
        if (item.status === 'reserved') {
          const row = requests.find(req => req.listingId === item.id && req.status === 'accepted');
          Object.assign(row, { status: 'cancelled', cancellationReason: 'The listing was hidden.' });
          item.status = 'available';
        }
        return envelope({ listing: adminListing(item) });
      }
      if (method === 'GET') {
        if (!visible(item) && !owned(item) && !requests.some(row => row.listingId === item.id && row.requester.id === user.id)) missing();
        return envelope({ listing: detail(item) });
      }
      if (action === 'requests') {
        if (!visible(item) || owned(item) || requests.some(row => row.listingId === item.id && row.requester.id === user.id && active(row))) conflict();
        const days = (Date.parse(body.returnDate) - Date.parse(body.proposedPickupDate)) / 86400000;
        if (temporary(item.listingType) && !(body.proposedPickupDate >= campusToday() && Number.isInteger(days) && days >= 1 && days <= 365)) bad('returnDate', 'Choose valid pickup and return dates, up to 365 days apart.');
        if (item.listingType === 'exchange' && !body.offeredItemDescription?.trim()) bad('offeredItemDescription', 'Describe the offered item.');
        const fee = Math.round(Number(item.amountBdt) * 100) * days;
        if (item.listingType === 'rent' && fee > 999999999) bad('returnDate', 'Rental fee exceeds the maximum amount.');
        const request = { id: newId(), listingId: item.id, requester: publicUser(user), listingType: item.listingType,
          status: 'pending', termsAmountBdt: item.amountBdt, listingExchangeTerms: item.exchangeTerms,
          proposedPickupDate: body.proposedPickupDate ?? null, returnDate: body.returnDate ?? null,
          rentalFeeBdt: item.listingType === 'rent' ? (fee / 100).toFixed(2) : null,
          offeredItemDescription: body.offeredItemDescription ?? null, createdAt: now() };
        requests.unshift(request);
        return envelope({ request }, 201);
      }
      if (!owned(item)) forbidden();
      if (!visible(item)) conflict();
      if (method === 'PATCH') return save(item);
      if (method === 'DELETE' || action === 'close') {
        cancelPending(item, method === 'DELETE' ? 'The owner deleted the post.' : 'The owner closed the post.');
        if (method === 'DELETE') { item.deleted = true; return new Response(null, { status: 204 }); }
        item.status = 'closed';
        return envelope({ listing: detail(item) });
      }
    }
    const requestRoute = /^\/requests\/([a-f0-9]{24})(?:\/(accept|decline|cancel|handover|return))?$/.exec(route);
    if (!requestRoute) missing();
    const request = requests.find(row => row.id === requestRoute[1]);
    if (!request) missing();
    const item = listings.find(entry => entry.id === request.listingId);
    const owner = owned(item);
    const requester = request.requester.id === user.id;
    if (!owner && !requester) missing();
    const action = requestRoute[2];
    if (method === 'GET') return envelope({ request });
    if (action !== 'cancel' && !owner) forbidden();
    switch (action) {
      case 'accept':
        if (request.status !== 'pending' || !visible(item)) conflict();
        if (!(body.pickupPoint?.length >= 3 && body.pickupPoint.length <= 120) || !(Date.parse(body.pickupAt) >= Date.now())) bad('pickupAt', 'Choose a valid future campus pickup.');
        if (temporary(request.listingType) && new Date(Date.parse(body.pickupAt) + 21600000).toISOString().slice(0, 10) !== request.proposedPickupDate) bad('pickupAt', 'Use the proposed campus date.');
        request.status = 'accepted';
        request.pickupPoint = body.pickupPoint;
        request.pickupAt = body.pickupAt;
        item.status = 'reserved';
        requests.filter(row => row.listingId === item.id && row.status === 'pending').forEach(row => { row.status = 'declined'; });
        break;
      case 'decline':
        if (request.status !== 'pending') conflict();
        request.status = 'declined';
        break;
      case 'cancel':
        if (!(requester && request.status === 'pending') && request.status !== 'accepted') conflict();
        if (request.status === 'accepted') item.status = 'available';
        request.status = 'cancelled';
        if (body.reason) request.cancellationReason = body.reason;
        break;
      case 'handover':
        if (request.status !== 'accepted') conflict();
        if (request.listingType === 'exchange' && body.confirmBothItemsExchanged !== true) bad('confirmBothItemsExchanged', 'Confirm both items were exchanged.');
        item.status = request.status = temporary(request.listingType) ? 'checked_out' : 'completed';
        request.handedOverAt = now();
        break;
      case 'return':
        if (request.status !== 'checked_out') conflict();
        request.status = 'completed';
        request.returnedAt = now();
        item.status = 'available';
        break;
      default: missing();
    }
    return envelope(['accept', 'handover', 'return'].includes(action) ? { request, listingStatus: item.status } : { request });
  }

  return {
    mockFetch: async (path, init) => {
      try { return await dispatch(path, init); }
      catch (error) { if (error instanceof Response) return error; throw error; }
    },
    mockUpload(assetId, file) {
      const asset = assets.get(assetId);
      if (asset?.owner !== user?.id || !asset || asset.url) throw new Error('Mock upload unavailable.');
      asset.url = URL.createObjectURL(file);
    },
  };
}

export const { mockFetch, mockUpload } = createMockApi();
