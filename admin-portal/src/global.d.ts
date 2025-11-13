/**
 * Global Type Declarations
 *
 * Extends the Window interface with custom properties used in the application.
 */

import { PublicClientApplication } from '@azure/msal-browser';

declare global {
  interface Window {
    /**
     * Microsoft Authentication Library (MSAL) instance
     * Used for Azure AD authentication throughout the application
     */
    msalInstance: PublicClientApplication;
  }
}

// This export is required to make this file a module
export {};
