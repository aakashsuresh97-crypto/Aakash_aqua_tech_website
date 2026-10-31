import { useCallback, useEffect, useState } from 'react';
import Layout from './components/Layout.jsx';
import CartModal from './components/CartModal.jsx';
import Spinner from './components/Spinner.jsx';
import LoginPage from './pages/LoginPage.jsx';
import { ROUTES, routeFromHash } from './routes.jsx';
import { UserContext } from './auth/UserContext.js';
import useCart from './hooks/useCart.js';
import { getMe } from './api/authApi.js';
import { clearInflight } from './api/categoryApi.js';
import { clearCustomerToken, clearToken, getToken, SESSION_EXPIRED_EVENT } from './auth/session.js';

// Tiny hash router (#/orders, #/leads ...): the route table lives in routes.jsx, so a refresh keeps the page and no router library is needed.
const pageFromHash = routeFromHash;

export default function App() {
  // status: 'checking' (validating a stored token) | 'out' (show login) | 'in' | 'error' (API unreachable)
  const [auth, setAuth] = useState({ status: getToken() ? 'checking' : 'out', user: null, notice: '' });
  const [page, setPage] = useState(pageFromHash);
  const [cartOpen, setCartOpen] = useState(false);
  const cart = useCart();

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Any 401 from the API (expired / invalid token) lands here.
  useEffect(() => {
    const onExpired = () => { clearInflight(); setAuth({ status: 'out', user: null, notice: 'Your session has expired. Please sign in again.' }); };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  // A stored token is only trusted after the server confirms it (also catches disabled accounts).
  const checkSession = useCallback(() => {
    setAuth((a) => ({ ...a, status: 'checking' }));
    getMe().then(
      (res) => setAuth({ status: 'in', user: res.data, notice: '' }),
      (err) => { if (err.status !== 401) setAuth({ status: 'error', user: null, notice: err.message }); }, // 401 is handled by the expiry event
    );
  }, []);
  useEffect(() => { if (getToken()) checkSession(); }, [checkSession]);

  const logout = () => {
    clearToken();
    clearCustomerToken();
    clearInflight();
    setCartOpen(false);
    setAuth({ status: 'out', user: null, notice: '' });
  };

  if (auth.status === 'checking') {
    return <div className="flex min-h-screen items-center justify-center text-slate-500"><Spinner className="h-8 w-8" label="Checking your session" /></div>;
  }
  if (auth.status === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p role="alert" className="text-slate-700">{auth.notice}</p>
        <div className="flex gap-2">
          <button type="button" className="btn-primary" onClick={checkSession}>Retry</button>
          <button type="button" className="btn-secondary" onClick={logout}>Sign out</button>
        </div>
      </div>
    );
  }
  if (auth.status === 'out') {
    return <LoginPage notice={auth.notice} onLoggedIn={(user) => setAuth({ status: 'in', user, notice: '' })} />;
  }

  const route = ROUTES[page];
  return (
    <UserContext.Provider value={auth.user}>
      <Layout page={page} user={auth.user} onLogout={logout} cartCount={cart.count} onOpenCart={() => setCartOpen(true)}>
        <div key={page}>{route.render({ onOpenCart: () => setCartOpen(true) })}</div>
        <CartModal open={cartOpen} cart={cart} onClose={() => setCartOpen(false)} />
      </Layout>
    </UserContext.Provider>
  );
}
