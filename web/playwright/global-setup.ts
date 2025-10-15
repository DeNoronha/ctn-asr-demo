/**
 * Global Playwright Setup
 *
 * Ensures sessionStorage (where MSAL stores tokens) is properly loaded
 */

import fs from 'node:fs';
import path from 'node:path';
import { type FullConfig, chromium } from '@playwright/test';

async function globalSetup(_config: FullConfig) {
  console.log('🔧 Playwright Global Setup: Preparing authentication state...');

  const authFile = path.join(__dirname, '.auth', 'user.json');

  if (!fs.existsSync(authFile)) {
    console.warn('⚠️  No authentication state found. Run: node scripts/capture-auth-final.js');
    return;
  }

  const storageState = JSON.parse(fs.readFileSync(authFile, 'utf8'));

  // Check if we have sessionStorage entries
  const hasSessionStorage = storageState.origins?.some(
    (origin: { sessionStorage?: unknown[] }) => origin.sessionStorage && origin.sessionStorage.length > 0
  );

  if (hasSessionStorage) {
    console.log('✅ Authentication state includes sessionStorage (MSAL tokens)');
  } else {
    console.warn('⚠️  No sessionStorage found. Authentication may not work properly.');
  }

  console.log('✅ Global setup complete');
}

export default globalSetup;
