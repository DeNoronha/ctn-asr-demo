# Playwright E2E Testing with Azure Entra ID Authentication

This directory contains shared authentication setup for Playwright E2E testing across all CTN portals.

## Overview

The Playwright testing setup provides:

- **Shared Authentication** - Single authentication flow that works across all portals
- **Multi-Portal Testing** - Separate test projects for Admin, Member, and Booking portals
- **Azure Entra ID Integration** - Automated login with Azure AD (MSAL)
- **Reusable Session State** - Authenticate once, run all tests

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  tests/auth.setup.ts                                │
│  - Authenticates with Azure Entra ID                │
│  - Handles "Stay signed in?" prompt                 │
│  - Saves session to playwright/.auth/user.json      │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│  playwright/.auth/user.json                         │
│  - Contains session cookies                         │
│  - Contains sessionStorage (MSAL tokens)            │
│  - Reused across all portal tests                   │
└─────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │  Admin   │   │  Member  │   │ Booking  │
   │  Portal  │   │  Portal  │   │  Portal  │
   └──────────┘   └──────────┘   └──────────┘
```

## Test Credentials

**IMPORTANT**: Credentials are hardcoded in `tests/auth.setup.ts` as per requirements.

- **Email**: test-e2@denoronha.consulting
- **Password**: Madu5952
- **Object ID**: 7e093589-f654-4e53-9522-898995d1201b
- **Role**: SystemAdmin
- **MFA**: Excluded (for automated testing)

## Quick Start

### 1. Install Dependencies

From the **root directory** of the monorepo:

```bash
npm install
```

### 2. Run Authentication Setup

This runs the auth setup once to capture the session:

```bash
npx playwright test --project=setup
```

**Expected Output**:
```
🔐 Starting Azure Entra ID authentication...
📧 User: test-e2@denoronha.consulting
✅ Redirected to Azure Entra ID login page
✅ Username entered
✅ Password entered
✅ Clicked "Yes" on "Stay signed in?" prompt
✅ Redirected back to: https://calm-tree-03352ba03.1.azurestaticapps.net
✅ Portal loaded successfully
✅ Found 8 MSAL token(s) in sessionStorage
💾 Saving authentication state to: /Users/.../playwright/.auth/user.json
✅ AUTHENTICATION SETUP COMPLETE
```

### 3. Run Portal Tests

#### Run All Portals
```bash
npx playwright test
```

#### Run Specific Portal
```bash
# Admin Portal
npx playwright test --project=admin-portal

# Member Portal
npx playwright test --project=member-portal

# Booking Portal
npx playwright test --project=booking-portal
```

#### Run Specific Test File
```bash
# Admin portal basic auth tests
npx playwright test admin-portal/e2e/basic-authentication.spec.ts --project=admin-portal

# Member portal basic auth tests
npx playwright test member-portal/e2e/basic-authentication.spec.ts --project=member-portal
```

### 4. View Test Results

```bash
# Open HTML report
npx playwright show-report

# View in terminal
npx playwright test --reporter=list
```

## Portal Configurations

### Admin Portal (ASR)
- **URL**: https://calm-tree-03352ba03.1.azurestaticapps.net
- **Test Directory**: `admin-portal/e2e/`
- **Projects**: `admin-portal`, `admin-portal-firefox`

### Member Portal (ASR)
- **URL**: https://calm-pebble-043b2db03.1.azurestaticapps.net
- **Test Directory**: `member-portal/e2e/`
- **Projects**: `member-portal`, `member-portal-firefox`

### Booking Portal (DocuFlow)
- **URL**: https://calm-mud-024a8ce03.1.azurestaticapps.net
- **Test Directory**: `booking-portal/e2e/`
- **Projects**: `booking-portal`

## File Structure

```
/
├── playwright.config.ts              # Root Playwright config (multi-portal)
├── tests/
│   ├── README.md                    # This file
│   └── auth.setup.ts                # Shared authentication setup
├── playwright/
│   └── .auth/
│       └── user.json                # Saved authentication state (gitignored)
│
├── admin-portal/
│   ├── playwright.config.ts         # Admin portal specific config
│   ├── playwright/
│   │   └── global-setup.ts          # Admin portal global setup
│   └── e2e/
│       ├── auth.setup.ts            # Admin portal auth setup (local)
│       ├── basic-authentication.spec.ts
│       └── critical-flows.spec.ts
│
├── member-portal/
│   ├── playwright.config.ts         # Member portal specific config
│   └── e2e/
│       ├── basic-authentication.spec.ts
│       └── security-headers.spec.ts
│
└── booking-portal/
    ├── playwright.config.ts         # Booking portal specific config (if exists)
    └── e2e/
        ├── basic-authentication.spec.ts
        └── week3-ux-improvements.spec.ts
```

## Common Commands

### Re-authenticate (Refresh Session)
```bash
npx playwright test --project=setup
```

### Run with UI (Debugging)
```bash
npx playwright test --ui
```

### Run in Headed Mode (See Browser)
```bash
npx playwright test --headed
```

### Run with Specific Browser
```bash
npx playwright test --project=admin-portal-firefox
```

### Generate Test Code
```bash
npx playwright codegen https://calm-tree-03352ba03.1.azurestaticapps.net
```

### Update Playwright
```bash
npm install -D @playwright/test@latest
npx playwright install
```

## Troubleshooting

### Authentication Fails

**Problem**: Tests redirect to Azure AD login page instead of using saved session.

**Solutions**:
1. Re-run the setup: `npx playwright test --project=setup`
2. Check that `playwright/.auth/user.json` exists and is not empty
3. Verify credentials in `tests/auth.setup.ts` are correct
4. Check that MSAL tokens haven't expired (they expire after ~1 hour)

### Token Expiration

**Problem**: MSAL tokens expire within 1 hour.

**Solution**:
1. Run setup before each test session: `npx playwright test --project=setup`
2. For CI/CD, consider implementing token refresh logic in global setup

### "Stay signed in?" Not Handled

**Problem**: Test hangs at "Stay signed in?" prompt.

**Check**:
1. Verify the button selector in `tests/auth.setup.ts`
2. Current selector: `input[type="submit"][value="Yes"]`
3. If Microsoft changes the UI, update the selector

### Tests Run But Don't Use Auth State

**Problem**: Tests run but start from login page.

**Solutions**:
1. Verify `playwright.config.ts` has `storageState: 'playwright/.auth/user.json'`
2. Check that the setup project completed successfully
3. Ensure portal projects have `dependencies: ['setup']`

### Different Portal, Same Auth State?

**Yes!** The same Azure Entra ID authentication works across:
- Admin Portal (https://calm-tree-03352ba03.1.azurestaticapps.net)
- Member Portal (https://calm-pebble-043b2db03.1.azurestaticapps.net)
- Booking Portal (https://calm-mud-024a8ce03.1.azurestaticapps.net)

All portals use the same Azure AD tenant and client ID, so one authentication session works for all.

## CI/CD Integration

### Azure DevOps Pipeline

```yaml
- task: NodeTool@0
  inputs:
    versionSpec: '20.x'

- script: npm ci
  displayName: 'Install dependencies'

- script: npx playwright install --with-deps
  displayName: 'Install Playwright browsers'

- script: npx playwright test --project=setup
  displayName: 'Authenticate with Azure Entra ID'
  env:
    # Credentials already hardcoded in tests/auth.setup.ts
    # No environment variables needed

- script: npx playwright test
  displayName: 'Run E2E tests for all portals'

- task: PublishTestResults@2
  inputs:
    testResultsFormat: 'JUnit'
    testResultsFiles: 'playwright-report/junit.xml'
  condition: always()
```

### GitHub Actions

```yaml
- name: Install dependencies
  run: npm ci

- name: Install Playwright browsers
  run: npx playwright install --with-deps

- name: Authenticate with Azure Entra ID
  run: npx playwright test --project=setup

- name: Run E2E tests
  run: npx playwright test

- name: Upload test results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

## Security Notes

1. **Credentials are hardcoded** in `tests/auth.setup.ts` as per requirements
2. **Auth state is gitignored** - `playwright/.auth/user.json` never committed
3. **Test account has MFA disabled** - Required for automated testing
4. **Use SystemAdmin test account only** - Never use production accounts

## Best Practices

1. **Run setup before each test session** to ensure fresh tokens
2. **Use separate test accounts** - Never test with production user accounts
3. **Keep auth state local** - Never commit `playwright/.auth/user.json`
4. **Monitor token expiration** - Re-authenticate if tests fail due to expired tokens
5. **Run tests serially** - Avoid auth conflicts (configured in playwright.config.ts)

## Additional Documentation

- [Playwright Testing Guide](/docs/PLAYWRIGHT_SETUP_GUIDE.md)
- [Portal Configurations](/docs/PORTAL_CONFIGURATIONS.md)
- [Login Selectors Reference](/docs/LOGIN_SELECTORS_AND_ENDPOINTS.md)
- [Portal Testing Index](/docs/PORTAL_TESTING_INDEX.md)

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section above
2. Review documentation in `/docs/`
3. Check existing tests in portal `e2e/` directories for examples
4. Verify Azure Entra ID portal configuration for test user

---

**Last Updated**: November 1, 2025
**Playwright Version**: 1.56.1
**Node Version**: 20.x
