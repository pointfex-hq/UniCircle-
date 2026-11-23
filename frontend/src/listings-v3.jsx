import React, { useEffect, useState } from 'react';
import { api, campusToday, conditions, decimalAmount, eligible, money, temporary, types } from './api.js';
import { Badge, ItemVisual } from './visuals.jsx';
import { Field, State, formValues, useOperation, useResource } from './ui.jsx';

const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const photoLimit = 5 * 1024 * 1024;

async function uploadPhoto(file) {
  const { upload } = await api('/listings/photos/sign', { method: 'POST', body: {
    fileName: file.name, contentType: file.type, sizeBytes: file.size,
  } });
  if (!(import.meta.env.DEV && import.meta.env.VITE_MOCK_API === '1')) {
    const origin = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!origin || !key) throw new Error('Photo storage is unavailable. Retry or remove the photo.');
    const path = [upload.bucket, ...upload.path.split('/')].map(encodeURIComponent).join('/');
    const url = new URL('/storage/v1/object/upload/sign/' + path, origin);
    url.searchParams.set('token', upload.token);
    const form = new FormData();
    form.append('cacheControl', '3600');
    form.append('', file);
    const response = await fetch(url, { method: 'PUT', headers: { apikey: key, 'x-upsert': 'false' }, body: form });
    if (!response.ok) throw new Error('Photo upload failed. Retry or remove the photo.');
  } else {
    const { mockUpload } = await import('./mocks/api.js');
    mockUpload(upload.photoAssetId, file);
  }
  const { photo } = await api('/listings/photos/confirm', { method: 'POST', body: { photoAssetId: upload.photoAssetId } });
  return photo.photoAssetId;
}

const priceOptions = [
  ['paid', 'Paid', 'Sell or rent this item'],
  ['exchange', 'Exchange', 'Swap for another item'],
  ['donate', 'Free (Donate)', 'Give it away for free'],
  ['free_borrowing', 'Free Borrowing', 'Lend it at no cost'],
];

export function ListingEditor({ id, user, navigate }) {
  const listing = useResource(id ? '/listings/' + id : null);
  const categories = useResource('/categories');
  return <State resource={categories}>{({ items }) => id
    ? <State resource={listing}>{({ listing: item }) => eligible(item, user)
      ? <ListingForm key={item.id} item={item} categories={items} navigate={navigate} reload={listing.reload} />
      : <p className="panel">This listing cannot be edited.</p>}</State>
    : <ListingForm categories={items} navigate={navigate} />}</State>;
}

function ListingForm({ item, categories, navigate, reload }) {
  const [type, setType] = useState(item?.listingType ?? 'sell');
  const [amount, setAmount] = useState(item?.amountBdt ?? '');
  const [terms, setTerms] = useState(item?.exchangeTerms ?? '');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [removePhoto, setRemovePhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [inputKey, setInputKey] = useState(0);
  const [asset, setAsset] = useState(null);
  const op = useOperation();
  const paid = type === 'sell' || type === 'rent';
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  function choose(next) {
    setType(next);
    setAmount('');
    setTerms('');
  }
  function chooseFile(next) {
    setAsset(null);
    if (next && (!imageTypes.includes(next.type) || next.size > photoLimit || !next.size)) {
      setFile(null);
      setPhotoError('Choose a nonempty JPG, PNG, or WebP up to 5 MiB.');
      return;
    }
    setPhotoError('');
    setFile(next);
  }
  function submit(event) {
    event.preventDefault();
    const data = formValues(event);
    op.run(async () => {
      if (photoError) throw new Error('Replace or clear the invalid photo.');
      const amountBdt = paid ? decimalAmount(amount) : '0.00';
      if (paid && !amountBdt) throw Object.assign(new Error('Enter a positive BDT amount with up to two decimal places.'), {
        fields: { amountBdt: 'Enter an amount from 0.01 to 9,999,999.99.' },
      });
      if (data.title.trim().length < 3 || data.description.trim().length < 10) throw new Error('Enter a title of at least 3 characters and a description of at least 10.');
      if (type === 'exchange' && !terms.trim()) throw new Error('Describe what you would accept.');
      const body = { title: data.title.trim(), description: data.description.trim(), categoryId: data.categoryId,
        condition: data.condition, listingType: type };
      if (type === 'exchange') body.exchangeTerms = terms.trim();
      else body.amountBdt = amountBdt;
      if (file) {
        body.photoAssetId = asset ?? await uploadPhoto(file);
        setAsset(body.photoAssetId);
      } else if (removePhoto) body.photoAssetId = null;
      if (item) body.version = item.version;
      await api(item ? '/listings/' + item.id : '/listings', { method: item ? 'PATCH' : 'POST', body });
      navigate('/activity');
    });
  }
  return <section className="post-page">
    <div className="post-heading"><a href={item ? '/activity' : '/marketplace'}>Back</a><h1>{item ? 'Edit listing' : 'Post an item'}</h1></div>
    {op.feedback}
    {op.error?.status === 409 && item && <button type="button" onClick={reload}>Reload current listing</button>}
    <form onSubmit={submit}><fieldset className="post-block" disabled={op.busy}>
      <legend>Price option</legend>
      <div className="post-types">{priceOptions.map(([value, title, description]) => <label className="post-type" key={value}>
        <input type="radio" name="priceOption" checked={(paid ? 'paid' : type) === value} onChange={() => choose(value === 'paid' ? 'sell' : value)} />
        <span><strong>{title}</strong><small>{description}</small></span>
      </label>)}</div>
      {paid && <div className="post-detail-row">
        <Field name="listingType" label="Paid listing type" value={type} onChange={event => choose(event.target.value)}>
          <select><option value="sell">Sell</option><option value="rent">Rent</option></select>
        </Field>
        <Field name="amountBdt" error={op.error} label={type === 'rent' ? 'Daily rate (BDT)' : 'Sale price (BDT)'} inputMode="decimal"
          value={amount} onChange={event => setAmount(event.target.value)} required />
      </div>}
      {type === 'exchange' && <Field name="exchangeTerms" error={op.error} label="What would you accept?" maxLength={500} required
        value={terms} onChange={event => setTerms(event.target.value)}><textarea rows="2" /></Field>}
    </fieldset>
    {item && <p className="muted">Changing the type, price or exchange terms cancels pending requests.</p>}
    <fieldset className="post-block" disabled={op.busy}><legend>Item details</legend>
      <Field name="title" label="Item title" error={op.error} defaultValue={item?.title} required minLength={3} maxLength={100} />
      <div className="post-detail-row">
        <Field name="categoryId" label="Category" error={op.error} defaultValue={item?.category?.id ?? ''} required>
          <select><option value="" disabled>Select category</option>{categories.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
        </Field>
        <Field name="condition" label="Condition" error={op.error} defaultValue={item?.condition ?? ''} required>
          <select><option value="" disabled>Select condition</option>{Object.entries(conditions).map(([code, title]) => <option key={code} value={code}>{title}</option>)}</select>
        </Field>
      </div>
      <Field name="description" label="Description" error={op.error} defaultValue={item?.description} required minLength={10} maxLength={2000}>
        <textarea rows="4" />
      </Field>
    </fieldset>
    <fieldset className="post-block post-photo" disabled={op.busy}><legend>Photo</legend>
      <p className="muted">Optional. JPG, PNG or WebP up to 5 MiB.</p>
      <Field key={inputKey} name="photo" label="Upload a photo" type="file" accept={imageTypes.join(',')} error={op.error}
        onChange={event => chooseFile(event.target.files[0] ?? null)} />
      {photoError && <p role="alert" className="error">{photoError}</p>}
      {(preview || (!removePhoto && item?.photoUrl)) && <img className="photo-preview" alt="Listing photo preview" src={preview || item.photoUrl} />}
      {(file || photoError) && <button type="button" className="secondary" onClick={() => { chooseFile(null); setInputKey(key => key + 1); }}>Clear selected photo</button>}
      {item?.photoUrl && <label><input type="checkbox" checked={removePhoto} onChange={event => setRemovePhoto(event.target.checked)} /> Remove current photo</label>}
    </fieldset>
    <div className="actions"><button disabled={op.busy}>{op.busy ? 'Saving…' : item ? 'Save changes' : 'Post item'}</button>
      <a href={item ? '/activity' : '/marketplace'}>Cancel</a></div>
    </form>
  </section>;
}

export function ListingDetails({ id, user }) {
  const resource = useResource('/listings/' + id);
  return <State resource={resource}>{({ listing }) => <Details item={listing} user={user} />}</State>;
}

function Details({ item, user }) {
  const [open, setOpen] = useState(false);
  const [pickup, setPickup] = useState('');
  const [request, setRequest] = useState(null);
  const op = useOperation();
  const canRequest = item.owner.id !== user.id && item.status === 'available' && !item.isHidden;
  return <section>
    <a href="/marketplace">Back to marketplace</a>
    <div className="detail-layout"><ItemVisual item={item} /><article className="panel">
      <Badge>{types[item.listingType]}</Badge><h1>{item.title}</h1>
      <strong className="price">{money(item)}</strong>
      <p>{item.category.name} · {conditions[item.condition]} · {item.owner.displayName}</p>
      <p>{item.description}</p>
      {item.exchangeTerms && <p>Looking for: {item.exchangeTerms}</p>}
      {item.isHidden && <p>Hidden{item.hiddenReason && ': ' + item.hiddenReason}</p>}
      {canRequest && !request && !open && <button onClick={() => setOpen(true)}>Request Item</button>}
      {open && !request && <form onSubmit={event => {
        event.preventDefault();
        const data = formValues(event);
        op.run(async () => {
          if (temporary(item.listingType)) {
            const days = (Date.parse(data.returnDate) - Date.parse(data.proposedPickupDate)) / 86400000;
            if (!Number.isInteger(days) || days < 1 || days > 365) {
              throw Object.assign(new Error('Return must be 1 to 365 days after pickup.'), {
                fields: { returnDate: 'Choose a date after pickup, within 365 days.' },
              });
            }
          }
          const { request: result } = await api('/listings/' + item.id + '/requests', { method: 'POST', body: data });
          setRequest(result);
        });
      }}>
        {temporary(item.listingType) && <>
          <Field name="proposedPickupDate" label="Proposed pickup date" type="date" min={campusToday()} value={pickup}
            onChange={event => setPickup(event.target.value)} error={op.error} required />
          <Field name="returnDate" label="Return date" type="date" min={pickup || campusToday()} error={op.error} required />
        </>}
        {item.listingType === 'exchange' && <Field name="offeredItemDescription" label="Item offered" error={op.error} required maxLength={500}>
          <textarea rows="2" />
        </Field>}
        {op.feedback}<div className="actions"><button disabled={op.busy}>Send request</button><button type="button" className="secondary" onClick={() => setOpen(false)}>Cancel</button></div>
      </form>}
      {request && <p role="status">Request sent. {request.rentalFeeBdt && 'Rental fee: ৳' + request.rentalFeeBdt + '. '}
        <a href="/activity?tab=sent">View sent requests</a></p>}
    </article></div>
  </section>;
}
