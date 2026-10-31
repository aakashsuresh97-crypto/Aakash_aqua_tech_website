import { request, sharedGet } from './categoryApi.js';

// POST /auth/login -> { data: { token, user } }. A 401 here means wrong credentials, so it must not trigger the "session expired" flow.
export const login = (email, password) => request('/auth/login', { method: 'POST', body: { email, password }, skipAuthExpiry: true });

// GET /auth/me -> { data: user }. Confirms the stored token is still valid and the account is active.
/* sharedGet: React StrictMode (npm run dev) runs the start-up effect twice; both calls share one request */
export const getMe = (signal) => sharedGet('/auth/me', signal);
