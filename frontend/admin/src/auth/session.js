// Admin session: the JWT lives in localStorage so a refresh keeps you signed in (it expires on the server, see JWT_EXPIRES_IN).
// Every read/write is wrapped: storage can be blocked (private mode), in which case the session lasts for this tab only.
const KEY = 'admin_token';
let memoryToken = null;

export const getToken = () => {
  try { return localStorage.getItem(KEY) || memoryToken; } catch { return memoryToken; }
};

export const setToken = (token) => {
  memoryToken = token;
  try { localStorage.setItem(KEY, token); } catch { /* storage unavailable */ }
};

export const clearToken = () => {
  memoryToken = null;
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
};

export const SESSION_EXPIRED_EVENT = 'admin:session-expired';

/** Called by the API client on any 401: forgets the token and tells the app to show the login page. */
export const expireSession = () => {
  clearToken();
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
};

// "Sign out" in the panel signs the person out of the whole site: the website keeps its own customer token (same browser, same origin),
// and an admin who logs out must have to enter email and password again, on the website as well.
const CUSTOMER_KEY = 'aakash-customer-token';
export const clearCustomerToken = () => {
  try { localStorage.removeItem(CUSTOMER_KEY); } catch { /* storage unavailable */ }
};
