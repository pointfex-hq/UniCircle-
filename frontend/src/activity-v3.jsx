import React from 'react';
import { actionPath, api, eligible, money, query, temporary, types } from './api.js';
import { Confirm, Field, State, formValues, useOperation, useResource } from './ui.jsx';

const formatTime = value => new Intl.DateTimeFormat('en-BD', {
  timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(value));
const readable = value => value.replaceAll('_', ' ');

export function Activity({ user, tab }) {
  const links = { listings: 'My Listings', sent: 'Requests Sent', received: 'Requests Received' };
  const selected = Object.hasOwn(links, tab) ? tab : 'listings';
  const resource = useResource(selected === 'listings' ? '/me/listings' : '/me/requests/' + selected);
  return <section><h1>My Activity</h1><nav className="tabs" aria-label="Activity">
    {Object.entries(links).map(([key, title]) => <a key={key} href={'/activity?tab=' + key} aria-current={selected === key ? 'page' : undefined}>{title}</a>)}
  </nav><State resource={resource}>{({ items, nextCursor }) => <>
    {items.length === 0 && <p className="panel">Nothing here yet.</p>}
    <HistoryRows key={selected} initial={items} cursor={nextCursor} tab={selected} user={user} reload={resource.reload} />
  </>}</State></section>;
}

function HistoryRows({ initial, cursor, tab, user, reload }) {
  const [extra, setExtra] = React.useState(null);
  const op = useOperation();
  const next = extra ? extra.cursor : cursor;
  const path = tab === 'listings' ? '/me/listings' : '/me/requests/' + tab;
  return <div className="stack">
    {[...initial, ...(extra?.items ?? [])].map(row => tab === 'listings'
      ? <OwnListing key={row.id} item={row} user={user} reload={reload} />
      : <RequestCard key={row.id} request={row} received={tab === 'received'} reload={reload} />)}
    {op.feedback}
    {next && <button disabled={op.busy} onClick={() => op.run(async () => {
      const page = await api(query(path, { cursor: next, limit: 20 }));
      setExtra(previous => ({ items: [...(previous?.items ?? []), ...page.items], cursor: page.nextCursor }));
    })}>Load More</button>}
  </div>;
}

function OwnListing({ item, user, reload }) {
  const op = useOperation();
  function change(method, suffix = '') {
    op.run(async () => {
      await api('/listings/' + item.id + suffix, { method, body: method === 'POST' ? {} : undefined });
      reload();
    });
  }
  return <article className="panel activity-card">
    <h2><a href={'/listings/' + item.id}>{item.title}</a></h2>
    <p>{types[item.listingType]} · {money(item)} · {readable(item.status)}</p>
    {item.isHidden && <p>Hidden{item.hiddenReason && ': ' + item.hiddenReason}</p>}
    {op.feedback}
    {eligible(item, user) && <div className="actions">
      <a className="button secondary" href={'/listings/' + item.id + '/edit'}>Edit</a>
      <Confirm title="Close Post" disabled={op.busy} onConfirm={() => change('POST', '/close')}>Close this post? Pending requests will be cancelled.</Confirm>
      <Confirm title="Delete Post" disabled={op.busy} onConfirm={() => change('DELETE')}>Remove this post? Pending requests will be cancelled and transaction history will be kept.</Confirm>
    </div>}
    {op.error?.status === 409 && <button onClick={reload}>Refresh activity</button>}
  </article>;
}

function RequestCard({ request, received, reload }) {
  const [accepting, setAccepting] = React.useState(false);
  const op = useOperation();
  const pending = request.status === 'pending';
  const accepted = request.status === 'accepted';
  const checkedOut = request.status === 'checked_out';
  function perform(action, body = {}) {
    op.run(async () => {
      await api(actionPath(request.id, action), { method: 'POST', body });
      reload();
    });
  }
  return <article className="panel activity-card">
    <h2>{types[request.listingType]} request</h2>
    <p><strong>{readable(request.status)}</strong>{received && ' · ' + request.requester.displayName}</p>
    <a href={'/listings/' + request.listingId}>View listing</a>
    {request.proposedPickupDate && <p>Proposed pickup: {request.proposedPickupDate} · Return: {request.returnDate}</p>}
    {request.rentalFeeBdt && <p>Rental fee: ৳{request.rentalFeeBdt}</p>}
    {!request.rentalFeeBdt && request.termsAmountBdt && <p>Agreed amount: ৳{request.termsAmountBdt}</p>}
    {request.listingExchangeTerms && <p>Requested in exchange: {request.listingExchangeTerms}</p>}
    {request.offeredItemDescription && <p>Offered: {request.offeredItemDescription}</p>}
    {request.pickupAt && <p>Pickup: {request.pickupPoint} · {formatTime(request.pickupAt)} (Dhaka)</p>}
    {checkedOut && request.returnDate < new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date()) && <p className="error">Return overdue</p>}
    {request.handedOverAt && <p>Handed over: {formatTime(request.handedOverAt)}</p>}
    {request.returnedAt && <p>Returned: {formatTime(request.returnedAt)}</p>}
    {request.cancellationReason && <p>{request.cancellationReason}</p>}
    {op.feedback}
    <div className="actions">
      {received && pending && <><button disabled={op.busy} onClick={() => setAccepting(value => !value)}>Accept</button>
        <button className="secondary" disabled={op.busy} onClick={() => perform('decline')}>Decline</button></>}
      {((!received && pending) || accepted) && <button className="secondary" disabled={op.busy} onClick={() => perform('cancel')}>Cancel Request</button>}
      {received && accepted && request.listingType === 'exchange' && <Confirm title="Confirm both items exchanged" disabled={op.busy}
        onConfirm={() => perform('handover', { confirmBothItemsExchanged: true })}>Confirm that both parties handed over their items.</Confirm>}
      {received && accepted && request.listingType !== 'exchange' && <button disabled={op.busy} onClick={() => perform('handover')}>Record handover</button>}
      {received && checkedOut && <button disabled={op.busy} onClick={() => perform('return')}>Confirm return</button>}
    </div>
    {accepting && <form onSubmit={event => {
      event.preventDefault();
      const values = formValues(event);
      const date = new Date(values.pickupAt + '+06:00');
      if (!(date.getTime() >= Date.now()) || (temporary(request.listingType) && values.pickupAt.slice(0, 10) !== request.proposedPickupDate)) {
        op.run(() => { throw new Error('Choose a future Dhaka pickup time on the proposed date, when required.'); });
        return;
      }
      perform('accept', { pickupPoint: values.pickupPoint.trim(), pickupAt: date.toISOString() });
    }}>
      <Field name="pickupPoint" label="Campus pickup location" minLength={3} maxLength={120} required error={op.error} />
      <Field name="pickupAt" label="Pickup time (Dhaka)" type="datetime-local" required error={op.error}
        min={request.proposedPickupDate ? request.proposedPickupDate + 'T00:00' : undefined}
        max={request.proposedPickupDate ? request.proposedPickupDate + 'T23:59' : undefined} />
      <button disabled={op.busy}>Confirm pickup</button>
    </form>}
    {op.error?.status === 409 && <button onClick={reload}>Refresh activity</button>}
  </article>;
}

export function Admin({ domains }) {
  const resource = useResource(domains ? '/admin/domains' : '/admin/listings?limit=20');
  return <section><h1>{domains ? 'University email domains' : 'Listing moderation'}</h1>
    <nav className="tabs" aria-label="Admin"><a href="/admin/domains" aria-current={domains ? 'page' : undefined}>Domains</a>
      <a href="/admin/listings" aria-current={!domains ? 'page' : undefined}>Listings</a></nav>
    <State resource={resource}>{data => domains
      ? <Domains items={data.items} reload={resource.reload} />
      : <Moderation initial={data} reload={resource.reload} />}</State>
  </section>;
}

function Domains({ items, reload }) {
  const op = useOperation();
  return <div className="stack">{op.feedback}<form className="panel" onSubmit={event => {
    event.preventDefault();
    const { domain } = formValues(event);
    op.run(async () => { await api('/admin/domains', { method: 'POST', body: { domain: domain.trim().toLowerCase() } }); reload(); });
  }}>
    <Field name="domain" label="Official university domain" required minLength={3} maxLength={253} error={op.error} />
    <button disabled={op.busy}>Add domain</button>
  </form>{items.map(domain => <article className="panel" key={domain.id}>
    <p>{domain.domain} · {domain.isActive ? 'Active' : 'Inactive'}</p>
    <Confirm title={domain.isActive ? 'Deactivate domain' : 'Activate domain'} disabled={op.busy} onConfirm={() => op.run(async () => {
      await api('/admin/domains/' + domain.id, { method: 'PATCH', body: { isActive: !domain.isActive } }); reload();
    })}>Change registration eligibility for {domain.domain}. Already verified users retain access.</Confirm>
  </article>)}</div>;
}

function Moderation({ initial, reload }) {
  const [extra, setExtra] = React.useState(null);
  const op = useOperation();
  const next = extra ? extra.nextCursor : initial.nextCursor;
  return <div className="stack">
    {!initial.items.length && <p className="panel">No listings to moderate.</p>}
    {[...initial.items, ...(extra?.items ?? [])].map(item => <ModerationRow key={item.id} item={item} reload={reload} />)}
    {op.feedback}
    {next && <button disabled={op.busy} onClick={() => op.run(async () => {
      const page = await api(query('/admin/listings', { cursor: next, limit: 20 }));
      setExtra(previous => ({ items: [...(previous?.items ?? []), ...page.items], nextCursor: page.nextCursor }));
    })}>Load More</button>}
  </div>;
}

function ModerationRow({ item, reload }) {
  const [open, setOpen] = React.useState(false);
  const op = useOperation();
  const detail = useResource(open ? '/admin/listings/' + item.id : null);
  return <article className="panel"><h2>{item.title}</h2>
    <p>{item.owner.displayName} · {readable(item.status)}{item.isHidden ? ' · Hidden' : ''}</p>
    <button className="secondary" onClick={() => setOpen(value => !value)}>{open ? 'Close details' : 'Moderation details'}</button>
    {open && <State resource={detail}>{({ listing }) => <>
      {listing.isHidden ? <p>{listing.hiddenReason || 'Hidden'}</p> : <form onSubmit={event => {
        event.preventDefault();
        const { reason } = formValues(event);
        op.run(async () => { await api('/admin/listings/' + item.id + '/hide', { method: 'POST', body: { reason: reason.trim() } }); reload(); });
      }}><Field name="reason" label="Reason for hiding" minLength={3} maxLength={500} required error={op.error} />
        <button disabled={op.busy}>Hide listing</button></form>}
      {op.feedback}
    </>}</State>}
  </article>;
}
