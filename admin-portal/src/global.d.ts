/**
 * Global Type Declarations
 *
 * Extends the Window interface with custom properties used in the application.
 */

import type { PublicClientApplication } from '@azure/msal-browser';

declare global {
  interface Window {
    /**
     * Microsoft Authentication Library (MSAL) instance
     * Used for Azure AD authentication throughout the application
     */
    msalInstance: PublicClientApplication;
  }
}
