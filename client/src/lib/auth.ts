/**
 * Grudge Studio Unified Authentication
 *
 * All auth flows produce the same result: a JWT stored as `grudge_auth_token`.
 *
 * Supported flows:
 *  1. Username/password → auth-gateway /api/login → JWT
 *  2. Puter.js sign-in  → /api/auth/puter { puterUuid } → JWT
 *  3. Auth-gateway redirect (external login page) → JWT via URL param
 *  4. Guest login → auth-gateway /api/guest → JWT
 *
 * Source of truth: auth-gateway-flax.vercel.app (shared `accounts` table)
 */

const AUTH_GATEWAY = 'https://auth-gateway-flax.vercel.app';

// ── localStorage keys (shared across all Grudge Studio apps) ──
const KEYS = {
  token: 'grudge_auth_token',
  grudgeId: 'grudge_id',
  userId: 'grudge_user_id',
  username: 'grudge_username',
  isPuter: 'grudge_puter_auth',
} as const;

export interface AuthData {
  token: string;
  grudgeId: string;
  userId: string;
  username: string;
  isPuter?: boolean;
}

// ── Storage helpers ──

/** Save auth response from any flow into localStorage. */
export function storeAuth(data: {
  token: string;
  grudgeId?: string;
  userId?: string;
  username?: string;
  displayName?: string;
  isPuter?: boolean;
}) {
  localStorage.setItem(KEYS.token, data.token);
  if (data.grudgeId) localStorage.setItem(KEYS.grudgeId, data.grudgeId);
  if (data.userId) localStorage.setItem(KEYS.userId, String(data.userId));
  localStorage.setItem(KEYS.username, data.displayName || data.username || 'Player');
  if (data.isPuter) localStorage.setItem(KEYS.isPuter, 'true');
}

/** Clear all auth data. */
function clearAuth() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}

// ── Public API ──

/** Get current auth data without redirecting. Returns null if not logged in. */
export function getAuthData(): AuthData | null {
  const token = localStorage.getItem(KEYS.token);
  const grudgeId = localStorage.getItem(KEYS.grudgeId);
  const userId = localStorage.getItem(KEYS.userId);
  const username = localStorage.getItem(KEYS.username);

  if (!token) return null;

  return {
    token,
    grudgeId: grudgeId || '',
    userId: userId || grudgeId || '',
    username: username || 'Player',
    isPuter: localStorage.getItem(KEYS.isPuter) === 'true',
  };
}

/** Check auth — redirects to login if missing. */
export function checkAuth(): AuthData | null {
  const auth = getAuthData();
  if (!auth) {
    redirectToLogin();
    return null;
  }
  return auth;
}

export function hasAuthToken(): boolean {
  return !!localStorage.getItem(KEYS.token);
}

/** Redirect to auth-gateway login page. */
export function redirectToLogin(customReturnUrl?: string) {
  const returnUrl = encodeURIComponent(customReturnUrl || window.location.href);
  window.location.href = `${AUTH_GATEWAY}?return=${returnUrl}`;
}

/**
 * Capture auth data from URL query parameters after an auth-gateway redirect.
 * Reads `token`, `grudge_id`, `user_id`, `username` from the URL and stores
 * them via storeAuth. Cleans the params from the URL afterwards.
 */
export function captureAuthCallback(): void {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (!token) return;

  storeAuth({
    token,
    grudgeId: params.get('grudge_id') ?? undefined,
    userId: params.get('user_id') ?? undefined,
    username: params.get('username') ?? undefined,
  });

  // Remove auth params from the URL without causing a navigation
  params.delete('token');
  params.delete('grudge_id');
  params.delete('user_id');
  params.delete('username');
  const newSearch = params.toString();
  const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
  window.history.replaceState(null, '', newUrl);
}

/** Logout — clears tokens and redirects. */
export function logout() {
  clearAuth();
  redirectToLogin();
}

/** Logout without redirect (for switching accounts, etc.) */
export function logoutSilent() {
  clearAuth();
}

// ── API call helper ──

/** Make an authenticated API call. Sends JWT in Authorization header. */
export async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T | null> {
  const token = localStorage.getItem(KEYS.token);

  if (!token) {
    logout();
    return null;
  }

  const response = await fetch(`/api/${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (response.status === 401) {
    logout();
    return null;
  }

  return response.json();
}

// ── Auth flows ──

/** Login with username + password via auth-gateway. */
export async function loginWithPassword(username: string, password: string) {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (data.success && data.token) {
    storeAuth(data);
  }
  return data;
}

/** Register via auth-gateway. */
export async function registerAccount(username: string, password: string, email?: string) {
  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, email }),
  });
  const data = await res.json();
  if (data.success && data.token) {
    storeAuth(data);
  }
  return data;
}

/** Bridge Puter.js auth to a Grudge JWT. Call after puter.auth.signIn(). */
export async function loginWithPuter(puterUuid: string, puterUsername: string) {
  const res = await fetch('/api/auth/puter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ puterUuid, puterUsername }),
  });
  const data = await res.json();
  if (data.success && data.token) {
    storeAuth({ ...data, isPuter: true });
  }
  return data;
}

/** Guest login via auth-gateway. */
export async function loginAsGuest(deviceId?: string) {
  const id = deviceId || crypto.randomUUID().slice(0, 12);
  const res = await fetch('/api/guest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId: id }),
  });
  const data = await res.json();
  if (data.success && data.token) {
    storeAuth(data);
  }
  return data;
}

/** Verify current token with server. Returns full profile or null. */
export async function verifyToken() {
  return apiCall('auth/verify');
}
