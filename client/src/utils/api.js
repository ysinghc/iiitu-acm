import { API } from './apiURL';

const TOKEN_KEY = 'acm_token';
const LEGACY_TOKEN_KEY = 'acm_admin_token';
const USER_KEY = 'acm_user';

export const V1 = `${API}/v1`;

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY) || '';
}

// Sessions live in the httpOnly `acm_token` cookie (set by the API on
// sign-in). We deliberately do NOT persist fresh tokens in localStorage —
// anything JS-readable is XSS-stealable. Stored legacy tokens remain as a
// fallback until they expire.
export function setSession(token, user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}

export function clearSession() {
  // Best-effort server logout (clears the cookie); local state clears anyway.
  try {
    fetch(`${API}/v1/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
  } catch { /* offline — still clear local state below */ }
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('acm_admin_user');
}

export function storedUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  // Guard against a doubled /api prefix: the API base already ends in /api,
  // so a call-site path of `/api/admin/...` would 404 as /api/api/admin/...
  let url = path;
  if (!url.startsWith('http')) {
    const base = API.replace(/\/+$/, '');
    if (base.endsWith('/api') && url.startsWith('/api/')) url = url.slice(4);
    url = `${base}${url}`;
  }
  const res = await fetch(url, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || data?.message || data?.error || `Request failed (${res.status})`;
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }
  return data;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};

export async function uploadImage(file) {
  const form = new FormData();
  form.append('image', file);
  const token = getToken();
  const res = await fetch(`${API}/admin/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  if (data.imageUrl?.startsWith('http') || data.imageUrl?.startsWith('/')) return data.imageUrl;
  return data.imageUrl;
}

export function resolveImg(url) {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  if (url.startsWith('/uploads')) {
    const base = API.startsWith('http') ? API.replace(/\/api\/?$/, '') : '';
    return `${base}${url}`;
  }
  return url;
}
