import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api, conditions, money, query, types } from './api.js';
import { Account } from './account-v3.jsx';
import { ListingDetails, ListingEditor } from './listings-v3.jsx';
import { Activity, Admin } from './activity-v3.jsx';
import { State, useOperation, useResource } from './ui.jsx';
import { Badge, ItemVisual } from './visuals.jsx';
import { CategoryRail, Footer, HeroCollage } from './marketplace-ui.jsx';
import './style.css';

const listingTypes = [
  { value: 'sell', label: 'Buy', color: 'mint', icon: 'M5 9h14l1 12H4L5 9Zm4 0V6a3 3 0 0 1 6 0v3' },
  { value: 'rent', label: 'Rent', color: 'blue', icon: 'M20 7v5h-5M4 17v-5h5m10.3-2A7.5 7.5 0 0 0 6 6.5L4 9m16 6-2 2.5A7.5 7.5 0 0 1 4.7 14' },
  { value: 'exchange', label: 'Exchange', color: 'amber', icon: 'M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4' },
  { value: 'donate', label: 'Donate', color: 'plum', icon: 'M12 20 4.5 12.8A4.6 4.6 0 1 1 12 7.6a4.6 4.6 0 1 1 7.5 5.2L12 20Z' },
  { value: 'free_borrowing', label: 'Free Borrowing', color: 'teal', icon: 'M12 6c-2.5-2-6-2.5-10-1v13c4-1.5 7.5-1 10 1 2.5-2 6-2.5 10-1V5c-4-1.5-7.5-1-10 1Zm0 0v13' },
  { value: '', label: 'All listings', color: 'slate', icon: 'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z' },
];

function Marketplace() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');
  const [free, setFree] = useState(false);
  const endpoint = query('/listings', { q: search.trim(), category, type, free: free || undefined, limit: 20 });
  const categories = useResource('/categories');
  const clear = () => { setSearch(''); setCategory(''); setType(''); setFree(false); };
  return <>
    <section className="hero editorial-hero">
      <div className="hero-copy">
        <h1>Good finds.<br /><span>On campus.</span></h1>
        <button type="button" className="button hero-button" onClick={() => document.getElementById('listing-search').focus()}>Explore listings</button>
      </div>
      <HeroCollage />
    </section>
    <section className="market-types" aria-labelledby="listing-types">
      <h2 id="listing-types">Browse by type</h2>
      <div className="type-grid" role="group" aria-label="Listing type">
        {listingTypes.map(option => <button type="button" key={option.value}
          className={'type-card type-' + option.color} aria-pressed={type === option.value}
          onClick={() => { setType(option.value); setFree(false); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={option.icon} /></svg>
          <span>{option.label}</span>
        </button>)}
      </div>
    </section>
    <section aria-labelledby="browse-title" className="browse">
      <div className="browse-heading">
        <h2 id="browse-title">{type ? listingTypes.find(option => option.value === type).label + ' listings' : 'Campus finds'}</h2>
        <label className="market-search"><span className="sr-only">Search listings</span>
          <input id="listing-search" type="search" placeholder="Search books, calculators and more" maxLength={100} value={search} onChange={e => setSearch(e.target.value)} />
        </label>
      </div>
      <State resource={categories}>{({ items }) => <CategoryRail category={category} onSelect={setCategory} categories={items} />}</State>
      <div className="listing-status">
        <div className="listing-filter-actions">
          <label className="check"><input type="checkbox" checked={free} onChange={event => {
            setFree(event.target.checked);
            if (event.target.checked) setType('');
          }} /> Free items only</label>
          {(search || category || type || free) && <button type="button" className="quiet reset-listings" onClick={clear}>Clear filters</button>}
        </div>
      </div>
      <Feed key={endpoint} endpoint={endpoint} />
    </section>
  </>;
}

function Feed({ endpoint }) {
  const resource = useResource(endpoint);
  return <State resource={resource}>{data => <FeedPage initial={data} endpoint={endpoint} />}</State>;
}

function FeedPage({ initial, endpoint }) {
  const [more, setMore] = useState(null);
  const operation = useOperation();
  const items = [...initial.items, ...(more?.items ?? [])];
  const cursor = more ? more.nextCursor : initial.nextCursor;
  return <>
    <p className="result-count" role="status">{items.length} listings shown</p>
    {items.length ? <div className="grid">{items.map(item => <article key={item.id} className="card">
      <a className="card-link" href={'/listings/' + item.id}>
        <div className="tile-media"><ItemVisual item={item} /><Badge>{item.listingType === 'sell' ? 'Buy' : types[item.listingType]}</Badge></div>
        <div className="card-body"><h3>{item.title}</h3><strong className="price">{money(item)}</strong>
          <p className="muted">{conditions[item.condition]} · {item.owner.displayName}</p></div>
      </a>
    </article>)}</div> : <p className="panel">No matching items. Try another search or category.</p>}
    {operation.feedback}
    {cursor && <button className="secondary load-more" disabled={operation.busy} onClick={() => operation.run(async () => {
      const page = await api(endpoint + '&cursor=' + encodeURIComponent(cursor));
      setMore(current => ({ items: [...(current?.items ?? []), ...page.items], nextCursor: page.nextCursor }));
    })}>{operation.busy ? 'Loading…' : 'Load More'}</button>}
  </>;
}


const publicPaths = new Set(['/signin', '/register', '/verify-email', '/forgot-password', '/reset-password']);
const tokenPath = new Set(['/verify-email', '/reset-password']);

function readLocation() {
  const url = new URL(location.href);
  const token = tokenPath.has(url.pathname) ? url.searchParams.get('token') : null;
  if (url.searchParams.has('token') && tokenPath.has(url.pathname)) {
    url.searchParams.delete('token');
    history.replaceState(null, '', url.pathname + url.search);
  }
  return { path: url.pathname, tab: url.searchParams.get('tab'), token };
}

const initialRoute = readLocation();

function App() {
  const [route, setRoute] = useState(initialRoute);
  const [user, setUser] = useState(undefined);
  const [sessionError, setSessionError] = useState(null);
  const [notice, setNotice] = useState('');
  const sessionLoad = useRef(0);
  const { path } = route;
  const verified = user?.verificationStatus === 'verified';

  function navigate(href, message = '') {
    history.pushState(null, '', href);
    setNotice(message);
    setRoute(readLocation());
    window.scrollTo(0, 0);
  }
  async function loadSession() {
    const attempt = ++sessionLoad.current;
    setSessionError(null);
    try {
      const result = await api('/auth/me');
      if (attempt === sessionLoad.current) setUser(result.user);
    }
    catch (error) {
      if (attempt !== sessionLoad.current) return;
      if (error.status === 401) setUser(null);
      else setSessionError(error);
    }
  }
  function establishSession(account) {
    ++sessionLoad.current;
    setSessionError(null);
    setUser(account);
  }

  useEffect(() => {
    loadSession();
    const onBack = () => { setNotice(''); setRoute(readLocation()); };
    const onLink = event => {
      const link = event.target.closest('a[href]');
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey ||
        event.altKey || link.target || link.hasAttribute('download') || !link.getAttribute('href').startsWith('/')) return;
      event.preventDefault();
      navigate(link.getAttribute('href'));
    };
    const expired = event => {
      setUser(event.type === 'unicircle:unauthorized' ? null : previous => previous && { ...previous, verificationStatus: 'unverified' });
    };
    addEventListener('popstate', onBack);
    addEventListener('unicircle:unauthorized', expired);
    addEventListener('unicircle:not-verified', expired);
    document.addEventListener('click', onLink);
    return () => {
      removeEventListener('popstate', onBack);
      removeEventListener('unicircle:unauthorized', expired);
      removeEventListener('unicircle:not-verified', expired);
      document.removeEventListener('click', onLink);
    };
  }, []);

  const home = user ? verified ? '/marketplace' : '/status' : '/signin';
  const redirect = user === undefined ? null : path === '/' ? home
    : !publicPaths.has(path) && !user ? '/signin'
    : user && !verified && !publicPaths.has(path) && path !== '/status' ? '/status'
    : verified && ['/signin', '/register', '/status'].includes(path) ? '/marketplace' : null;
  useEffect(() => {
    if (redirect && redirect !== path) {
      history.replaceState(null, '', redirect);
      setRoute(readLocation());
    }
  }, [redirect, path]);

  const listing = /^\/listings\/([a-f0-9]{24})(\/edit)?$/.exec(path);
  let page;
  if (sessionError && !publicPaths.has(path)) page = <p className="panel" role="alert">{sessionError.message} <button onClick={loadSession}>Retry</button></p>;
  else if ((user === undefined && !publicPaths.has(path)) || redirect) page = <p className="panel" role="status">Loading…</p>;
  else if (publicPaths.has(path) || path === '/status' || path === '/account') {
    page = <Account key={path} path={path} token={route.token} user={user} onSession={establishSession} navigate={navigate} />;
  } else if (path === '/marketplace') page = <Marketplace />;
  else if (path === '/post' || listing?.[2]) page = <ListingEditor key={path} id={listing?.[1]} user={user} navigate={navigate} />;
  else if (listing) page = <ListingDetails key={listing[1]} id={listing[1]} user={user} />;
  else if (path === '/activity') page = <Activity user={user} tab={route.tab} />;
  else if (['/admin/domains', '/admin/listings'].includes(path)) page = user?.role === 'admin'
    ? <Admin key={path} domains={path === '/admin/domains'} />
    : <p className="panel" role="alert">Administrator access is required.</p>;
  else page = <p className="panel">Page not found. <a href={home}>Go back</a></p>;

  const links = [['/marketplace', 'Marketplace'], ['/post', 'Post Item'], ['/activity', 'My Activity']];
  if (user?.role === 'admin') links.push(['/admin/domains', 'Admin']);
  return <>
    <a className="skip-link" href="#main" onClick={event => { event.preventDefault(); document.getElementById('main').focus(); }}>Skip to content</a>
    <header className="header"><div className="header-inner">
      <a className="brand" href={home} aria-label="UniCircle home">
        <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="12" r="5" /><circle cx="15" cy="12" r="5" /></svg></span>
        <span className="brand-name">Uni<strong>Circle</strong></span>
      </a>
      {verified && <nav aria-label="Main navigation">{links.map(([href, title]) =>
        <a href={href} key={href} aria-current={path === href ? 'page' : undefined}>{title}</a>)}</nav>}
      <div className="account-links">
        {user ? <a className="account-link" href={verified ? '/account' : '/status'}>{verified ? 'Profile' : 'Verification'}</a>
          : <><a className="account-link" href="/signin">Sign in</a><a className="account-link" href="/register">Register</a></>}
      </div>
    </div></header>
    <main id="main" className="shell" tabIndex={-1}>{notice && <p className="success" role="status">{notice}</p>}{page}</main>
    <Footer />
  </>;
}

createRoot(document.getElementById('root')).render(<App />);
