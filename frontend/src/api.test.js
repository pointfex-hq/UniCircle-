import assert from 'node:assert/strict';
import test from 'node:test';
import { createClient, decimalAmount } from './api.js';
import { createMockApi } from './mocks/api.js';

const post = body => ({ method: 'POST', body });
const email = name => name + '@seu.edu.bd';
const login = (api, name) => api('/auth/login', post({ universityEmail: email(name), password: 'LocalTest123!' }));

test('email verification gates listings and fixture tokens are single use', async () => {
  const api = createClient(createMockApi().mockFetch);
  await assert.rejects(api('/auth/me'), { status: 401 });
  const signed = await login(api, 'pending');
  assert.equal(signed.user.verificationStatus, 'unverified');
  await assert.rejects(api('/listings'), { status: 403, code: 'NOT_VERIFIED' });
  for (let i = 0; i < 5; i++) await api('/auth/resend-verification', post({ universityEmail: email('pending') }));
  await assert.rejects(api('/auth/resend-verification', post({ universityEmail: email('pending') })), { status: 429, retryAfter: '60' });
  const body = post({ token: 'fixture-token-for-local-testing' });
  await api('/auth/verify-email', body);
  await assert.rejects(api('/auth/verify-email', body), { code: 'TOKEN_INVALID_OR_EXPIRED' });
  assert.equal((await api('/auth/me')).user.verificationStatus, 'verified');
});

test('feed uses server cursor and listing deletion handles an empty 204', async () => {
  const api = createClient(createMockApi().mockFetch);
  await login(api, 'member');
  const first = await api('/listings?limit=20');
  const second = await api('/listings?limit=20&cursor=' + first.nextCursor);
  assert.equal(first.items.length, 20);
  assert.equal(second.items.length, 6);
  const { items } = await api('/categories');
  assert.equal(items.length, 8);
  const body = { title: 'Notebook', description: 'A clean test notebook.', categoryId: items[0].id, condition: 'poor', listingType: 'donate', amountBdt: '0.00' };
  const { listing } = await api('/listings', post(body));
  await assert.rejects(api('/listings/' + listing.id, { method: 'PATCH', body: { ...body, version: 2 } }), { status: 409 });
  assert.equal(await api('/listings/' + listing.id, { method: 'DELETE' }), undefined);
  await assert.rejects(api('/listings/' + listing.id), { status: 404 });
});

test('hidden checked-out rental can return without reappearing in the feed', async () => {
  const api = createClient(createMockApi().mockFetch);
  await login(api, 'member');
  const { items } = await api('/listings?type=rent');
  const listing = items[0];
  const pickup = new Date(Date.now() + 2 * 86400000);
  const pickupAt = pickup.toISOString();
  const proposedPickupDate = new Date(pickup.getTime() + 21600000).toISOString().slice(0, 10);
  const returnDate = new Date(pickup.getTime() + 21600000 + 3 * 86400000).toISOString().slice(0, 10);
  const { request } = await api('/listings/' + listing.id + '/requests', post({ proposedPickupDate, returnDate }));
  assert.equal(request.rentalFeeBdt, '300.00');
  const base = '/requests/' + request.id;
  await login(api, 'owner');
  await api(base + '/accept', post({ pickupPoint: 'Library entrance', pickupAt }));
  await api(base + '/handover', post({}));
  await login(api, 'admin');
  await assert.rejects(api(base), { status: 404 });
  await api('/admin/listings/' + listing.id + '/hide', post({ reason: 'Fixture moderation' }));
  await login(api, 'owner');
  assert.equal((await api(base + '/return', post({}))).listingStatus, 'available');
  assert.equal((await api('/listings/' + listing.id)).listing.hiddenReason, 'Fixture moderation');
  assert.ok(!(await api('/listings')).items.some(row => row.id === listing.id));
});

test('formats canonical BDT strings without float arithmetic', () => {
  assert.equal(decimalAmount('00012.4'), '12.40');
  for (const invalid of ['0', '-1', '10000000', '2.111', '1e2']) assert.equal(decimalAmount(invalid), null);
});
