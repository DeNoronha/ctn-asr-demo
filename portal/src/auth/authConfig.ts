import type { Configuration, PopupRequest } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.REACT_APP_AAD_CLIENT_ID || '',
    authority: process.env.REACT_APP_AAD_AUTHORITY || '',
    redirectUri: process.env.REACT_APP_AAD_REDIRECT_URI || window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

export const loginRequest: PopupRequest = {
  scopes: ['User.Read', 'openid', 'profile', 'email'],
};

export const apiRequest = {
  scopes: [`api://${process.env.REACT_APP_API_CLIENT_ID}/Member.Read`],
};
