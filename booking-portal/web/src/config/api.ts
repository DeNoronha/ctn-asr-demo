/**
 * API Configuration
 *
 * For local development: uses Vite proxy to localhost:7071
 * For production: uses Azure Function App URL
 */

const isDevelopment = import.meta.env.DEV;

export const API_CONFIG = {
  baseURL: isDevelopment
    ? '' // Use Vite proxy in development
    : 'https://func-ctn-booking-prod.azurewebsites.net'
};
