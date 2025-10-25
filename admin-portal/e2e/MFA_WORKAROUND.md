# MFA Workaround for Playwright Tests

## Problem

Azure AD MFA (Multi-Factor Authentication) blocks automated login because it requires:
- Approval on Microsoft Authenticator app
- SMS code entry
- Phone call verification

Playwright cannot interact with your phone or MFA apps.

## Solution Options

### Option 1: Manual Authentication State Capture (Recommended)

1. **Login manually once** and save the session:

```bash
cd web
npx playwright codegen --save-storage=playwright/.auth/user.json https://calm-tree-03352ba03.1.azurestaticapps.net
```

2. **What this does:**
   - Opens a browser
   - You log in manually (including MFA)
   - Saves all cookies and session data
   - Closes browser

3. **Tests will now use your saved session** - No more login needed!

4. **When to re-capture:**
   - If tests start failing with 401 errors
   - If your session expires (usually after 7-14 days)
   - If you log out manually

### Option 2: Create Test Account Without MFA

1. Create a dedicated test account in Azure AD
2. Assign it SystemAdmin or AssociationAdmin role
3. **Disable MFA** for this account only (via Conditional Access)
4. Use this account in `.env`:
   ```
   AZURE_AD_TEST_USERNAME=test-user@denoronha.consulting
   AZURE_AD_TEST_PASSWORD=test-password
   ```

**Pros:** Fully automated testing
**Cons:** Security concern (MFA disabled)

### Option 3: Use Azure AD Test Accounts

1. Some Azure AD tenants allow "test users" with simplified auth
2. Contact your Azure AD admin
3. Request a test account with MFA bypass for CI/CD

### Option 4: Skip Authentication Tests

Comment out the auth.setup.ts dependency and test with pre-authenticated state only:

```typescript
// In playwright.config.ts
{
  name: 'chromium',
  use: {
    ...devices['Desktop Chrome'],
    storageState: 'playwright/.auth/user.json',
  },
  // dependencies: ['setup'],  // Comment this out
},
```

Then manually capture auth state once (Option 1).

## Recommended Approach

**For now, use Option 1:**

1. Run the codegen command above
2. Log in manually with MFA
3. Let it save your session
4. Run tests normally - they'll use your saved session

```bash
# Capture auth state manually
npx playwright codegen --save-storage=playwright/.auth/user.json https://calm-tree-03352ba03.1.azurestaticapps.net

# Run tests (will use saved session)
npm run test:e2e
```

## Checking Session Status

If tests fail with 401 errors, your session expired. Re-capture:

```bash
rm playwright/.auth/user.json
npx playwright codegen --save-storage=playwright/.auth/user.json https://calm-tree-03352ba03.1.azurestaticapps.net
```

## For CI/CD Pipelines

For automated CI/CD, you'll need either:
- Option 2 (test account without MFA)
- Option 3 (Azure AD test accounts)
- Or skip E2E tests in CI and run them manually before releases

## Security Note

Never commit `playwright/.auth/user.json` - it contains your session tokens!
It's already in `.gitignore`.
