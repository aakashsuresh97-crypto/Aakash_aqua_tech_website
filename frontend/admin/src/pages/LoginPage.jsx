import { useState } from 'react';
import { login } from '../api/authApi.js';
import { setToken } from '../auth/session.js';
import Spinner from '../components/Spinner.jsx';

export default function LoginPage({ notice, onLoggedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const res = await login(email.trim(), password);
      setToken(res.data.token);
      onLoggedIn(res.data.user);
    } catch (err) {
      setError(err.errors?.length ? err.errors.join(' ') : err.message);
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-2xl font-semibold text-slate-900">Admin sign in</h1>
        <p className="mt-1 text-center text-sm text-slate-500">Aakash Pure Aqua Tech · catalogue management</p>
        <p className="mt-1 text-center text-xs text-slate-400">Use the email and password of an account that has been made an admin.</p>

        <form onSubmit={submit} noValidate className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {(error || notice) && (
            <div role="alert" className={`rounded-lg border px-3 py-2 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
              {error || notice}
            </div>
          )}
          <div>
            <label htmlFor="admin-email" className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input id="admin-email" type="email" autoComplete="username" required autoFocus className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="admin-password" className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input id="admin-password" type="password" autoComplete="current-password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={busy || !email || !password}>
            {busy && <Spinner className="h-4 w-4" />}
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm"><a href="/" className="text-slate-500 hover:text-slate-800">← Back to the website</a></p>
      </div>
    </div>
  );
}
