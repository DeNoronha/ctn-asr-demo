/**
 * Browser-safe stub for react-dom/server
 *
 * This module provides a browser-compatible implementation of react-dom/server
 * for Excel export functionality which uses renderToStaticMarkup to convert
 * React elements to strings.
 */

// Import the browser-safe version directly
export {
  renderToStaticMarkup,
  renderToString,
  version,
} from 'react-dom/cjs/react-dom-server-legacy.browser.production.min.js';
