/**
 * CSRF Token Service (SEC-004)
 * Implements double-submit cookie pattern for CSRF protection
 *
 * How it works:
 * 1. Generate random token on login
 * 2. Store in cookie (readable by JS)
 * 3. Send same token in X-CSRF-Token header
 * 4. Backend validates cookie matches header
 *
 * This prevents CSRF attacks because:
 * - Attacker cannot read cookie from different origin (SameSite)
 * - Attacker cannot set custom headers on cross-origin requests
 */

import { v4 as uuidv4 } from 'uuid';

const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

/**
 * CSRF Service
 * Manages CSRF token lifecycle (generate, read, clear)
 */
export class CsrfService {
  /**
   * Generate and store CSRF token in cookie
   * Called on login and token refresh
   *
   * @returns Generated CSRF token
   */
  generateToken(): string {
    const token = uuidv4();

    // Store in cookie (accessible to JavaScript for reading)
    // Secure: Only sent over HTTPS
    // SameSite=Strict: Not sent on cross-origin requests
    // Path=/: Available for all routes
    document.cookie = `${CSRF_COOKIE_NAME}=${token}; Secure; SameSite=Strict; Path=/`;

    return token;
  }

  /**
   * Get current CSRF token from cookie
   * Used to include in request headers
   *
   * @returns CSRF token or null if not found
   */
  getToken(): string | null {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === CSRF_COOKIE_NAME) {
        return value;
      }
    }
    return null;
  }

  /**
   * Remove CSRF token from cookie
   * Called on logout
   */
  clearToken(): void {
    document.cookie = `${CSRF_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; Path=/; Secure; SameSite=Strict`;
  }

  /**
   * Get the header name for CSRF token
   * Used by axios interceptor
   *
   * @returns Header name for CSRF token
   */
  getHeaderName(): string {
    return CSRF_HEADER_NAME;
  }

  /**
   * Get the cookie name for CSRF token
   * Used for backend validation
   *
   * @returns Cookie name for CSRF token
   */
  getCookieName(): string {
    return CSRF_COOKIE_NAME;
  }
}

// Export singleton instance
export const csrfService = new CsrfService();
