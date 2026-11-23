import React, { useEffect } from 'react';
import { api } from './api.js';
import { Field, State, formValues, useOperation, useResource } from './ui.jsx';

const titles = {
  '/signin': 'Sign in', '/register': 'Create an account', '/verify-email': 'Verify email',
  '/forgot-password': 'Forgot password', '/reset-password': 'Reset password', '/status': 'Verification status',
};

export function Account({ path, token, user, onSession, navigate }) {
  const op = useOperation();
  const registration = path === '/register';
  const reset = path === '/reset-password';
  const verify = path === '/verify-email';
  const forgot = path === '/forgot-password';
  const status = path === '/status';
  const profile = path === '/account';
  const verification = useResource(status && user ? '/verification/status' : null);
  useEffect(() => {
    if (verification.data?.verificationStatus === 'verified') onSession({ ...user, verificationStatus: 'verified' });
  }, [verification.data]);
  function submit(event) {
    event.preventDefault();
    const form = formValues(event);
    op.run(async () => {
      if (profile) {
        try { await api('/auth/logout', { method: 'POST' }); }
        catch (error) { if (error.status !== 401) throw error; }
        onSession(null);
        navigate('/signin');
      } else if (verify) {
        await api('/auth/verify-email', { method: 'POST', body: { token } });
        if (user) {
          const { user: current } = await api('/auth/me');
          onSession(current);
          navigate('/marketplace');
        } else navigate('/signin', 'Email verified. You can sign in now.');
      } else if (reset) {
        await api('/auth/reset-password', { method: 'POST', body: { token, newPassword: form.newPassword } });
        onSession(null);
        navigate('/signin', 'Password updated. Please sign in again.');
      } else if (status || forgot) {
        await api(status ? '/auth/resend-verification' : '/auth/forgot-password', {
          method: 'POST', body: { universityEmail: (status ? user.universityEmail : form.universityEmail).trim().toLowerCase() },
        });
        if (status) verification.reload();
      } else if (registration) {
        const { emailSent } = await api('/auth/register', { method: 'POST', body: {
          fullName: form.fullName.trim(), displayName: form.displayName.trim(),
          universityEmail: form.universityEmail.trim().toLowerCase(), password: form.password,
        } });
        navigate('/signin', emailSent ? 'Check your university email for a verification link.' : 'Account created. Sign in to request another verification link.');
      } else {
        const result = await api('/auth/login', { method: 'POST', body: {
          universityEmail: form.universityEmail.trim().toLowerCase(), password: form.password,
        } });
        onSession(result.user);
        navigate(result.user.verificationStatus === 'verified' ? '/marketplace' : '/status');
      }
    }, forgot ? 'If the account exists, a reset email will be sent.' : status ? 'If eligible, a verification email will be sent.' : '');
  }

  return <section className="auth-layout">
    <div className="auth-intro"><h2>Good finds. On campus.</h2></div>
    <div className="auth-main">
      {!user && <nav className="auth-tabs" aria-label="Account"><a href="/signin">Sign in</a><a href="/register">Register</a></nav>}
      <h1>{profile ? 'Your account' : titles[path]}</h1>
      {status && <p>Verification links expire after 60 minutes. You can request up to five links per hour.</p>}
      {(status || profile) && <p>{user?.universityEmail}</p>}
      {(reset || verify) && !token && <p role="alert">This link is missing a token. Request a new link.</p>}
      {op.feedback}
      <form onSubmit={submit}>
        {registration && <>
          <Field name="fullName" label="Full name" error={op.error} required maxLength={100} autoComplete="name" />
          <Field name="displayName" label="Display name" error={op.error} required minLength={2} maxLength={50} />
        </>}
        {!profile && !status && !verify && !reset && <Field name="universityEmail" label="University email" error={op.error} type="email"
          placeholder="name@seu.edu.bd" autoComplete="username" required />}
        {(registration || path === '/signin' || reset) && <Field name={reset ? 'newPassword' : 'password'} label={reset ? 'New password' : 'Password'}
          error={op.error} type="password" minLength={path === '/signin' ? undefined : 8}
          autoComplete={path === '/signin' ? 'current-password' : 'new-password'} required />}
        {status ? <State resource={verification}>{data =>
          <button disabled={op.busy || !data.canResend}>Resend verification email</button>
        }</State> : <button disabled={op.busy || ((reset || verify) && !token)}>
          {profile ? 'Sign out' : forgot ? 'Send reset link' : reset ? 'Update password' : titles[path]}
        </button>}
      </form>
      {status && <button className="quiet" disabled={op.busy} onClick={() => op.run(async () => {
        try { await api('/auth/logout', { method: 'POST' }); }
        catch (error) { if (error.status !== 401) throw error; }
        onSession(null);
        navigate('/signin');
      })}>Sign out</button>}
      {path === '/signin' && <a href="/forgot-password">Forgot password?</a>}
      {reset && <a href="/forgot-password">Request a new reset link</a>}
      {verify && <a href={user ? '/status' : '/signin'}>Request a new verification link</a>}
    </div>
  </section>;
}
