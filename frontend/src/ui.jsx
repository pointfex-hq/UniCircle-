import React, { useEffect, useRef, useState } from 'react';
import { api } from './api.js';

export function useResource(path) {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState({});
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    api(path, { signal: controller.signal }).then(
      data => { if (!controller.signal.aborted) setResult({ path, version, data }); },
      error => { if (!controller.signal.aborted) setResult({ path, version, error }); },
    );
    return () => controller.abort();
  }, [path, version]);
  return {
    ...(result.path === path && result.version === version ? result : {}),
    reload: () => setVersion(current => current + 1),
  };
}

export function State({ resource, children }) {
  if (resource.error) return <div className="panel" role="alert"><p>{resource.error.message}</p>
    <button type="button" className="secondary" onClick={resource.reload}>Retry</button></div>;
  if (!resource.data) return <p className="panel" role="status">Loading…</p>;
  return children(resource.data);
}

export function useOperation() {
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  async function run(operation, notice = '') {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError(null);
    setMessage('');
    try { await operation(); setMessage(notice); }
    catch (failure) { setError(failure); }
    finally { running.current = false; setBusy(false); }
  }
  return { run, busy, error, feedback: <>
    {error && <p role="alert" className="error">{error.message}{error.retryAfter && ' Retry-After: ' + error.retryAfter + '.'}</p>}
    {message && <p role="status" className="success">{message}</p>}
  </> };
}

export function Field({ name, label, error, children, ...props }) {
  const message = error?.fields?.[name];
  const id = React.useId();
  const attrs = { name, id, 'aria-invalid': message ? true : undefined,
    'aria-describedby': message ? id + '-error' : undefined, ...props };
  return <div className="field"><label htmlFor={id}>{label}</label>
    {children ? React.cloneElement(children, attrs) : <input {...attrs} />}
    {message && <p id={id + '-error'} className="error">{message}</p>}
  </div>;
}

export const formValues = event => Object.fromEntries(new FormData(event.currentTarget));

export function Confirm({ title, children, onConfirm, disabled }) {
  const dialog = useRef(null);
  return <>
    <button type="button" className="secondary" disabled={disabled} onClick={() => dialog.current.showModal()}>{title}</button>
    <dialog className="footer-dialog" ref={dialog} aria-label={title}>
      <h2>{title}</h2><p>{children}</p>
      <form method="dialog" className="actions">
        <button className="secondary" autoFocus>Cancel</button>
        <button type="button" onClick={() => { dialog.current.close(); onConfirm(); }}>Confirm</button>
      </form>
    </dialog>
  </>;
}
