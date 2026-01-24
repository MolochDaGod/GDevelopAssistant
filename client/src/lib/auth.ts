/**
 * Authentication utilities for Grudge Auth Gateway integration
 * Gateway URL: https://auth-gateway-flax.vercel.app
 */

const AUTH_GATEWAY = 'https://auth-gateway-flax.vercel.app';

export interface AuthData {
  token: string;
  userId: string;
  username: string;
}

/**
 * Check if user is authenticated by verifying localStorage tokens
 * @returns AuthData if authenticated, null otherwise (redirects to login)
 */
export function checkAuth(): AuthData | null {
  const token = localStorage.getItem('grudge_auth_token');
  const userId = localStorage.getItem('grudge_user_id');
  const username = localStorage.getItem('grudge_username');
  
  if (!token || !userId) {
    // No auth - redirect to login
    redirectToLogin();
    return null;
  }
  
  return {
    token,
    userId,
    username: username || 'Player'
  };
}

/**
 * Redirect to auth gateway login page
 * @param customReturnUrl Optional custom return URL (defaults to current location)
 */
export function redirectToLogin(customReturnUrl?: string) {
  const returnUrl = encodeURIComponent(customReturnUrl || window.location.href);
  window.location.href = `${AUTH_GATEWAY}?return=${returnUrl}`;
}

/**
 * Logout user by clearing tokens and redirecting to login
 */
export function logout() {
  localStorage.removeItem('grudge_auth_token');
  localStorage.removeItem('grudge_user_id');
  localStorage.removeItem('grudge_username');
  redirectToLogin();
}

/**
 * Make an authenticated API call
 * @param endpoint API endpoint (relative path)
 * @param options Fetch options
 * @returns Response data or null if unauthorized
 */
export async function apiCall<T = any>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T | null> {
  const token = localStorage.getItem('grudge_auth_token');
  
  if (!token) {
    logout();
    return null;
  }
  
  const response = await fetch(`/api/${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });
  
  // Handle 401 Unauthorized
  if (response.status === 401) {
    logout();
    return null;
  }
  
  return response.json();
}

/**
 * Check if user has a valid token (doesn't validate with server)
 */
export function hasAuthToken(): boolean {
  return !!(localStorage.getItem('grudge_auth_token') && localStorage.getItem('grudge_user_id'));
}

/**
 * Get current auth data without redirecting
 */
export function getAuthData(): AuthData | null {
  const token = localStorage.getItem('grudge_auth_token');
  const userId = localStorage.getItem('grudge_user_id');
  const username = localStorage.getItem('grudge_username');
  
  if (!token || !userId) {
    return null;
  }
  
  return {
    token,
    userId,
    username: username || 'Player'
  };
}
