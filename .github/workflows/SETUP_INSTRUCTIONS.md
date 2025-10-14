# GitHub Actions Setup for Playwright Tests

## Overview

The Playwright CI/CD pipeline is configured in `.github/workflows/playwright-tests.yml`. It runs E2E tests automatically on pushes and pull requests.

## Authentication Challenge

Playwright tests require authenticated session state (`playwright/.auth/user.json`), but this contains sensitive tokens that **should not** be committed to the repository.

## Setup Options

### Option 1: Manual Auth Cache (Recommended for Development)

1. **Capture auth state locally:**
   ```bash
   cd web
   node scripts/capture-auth-final.js
   ```

2. **Save to GitHub Actions cache:**

   Create a workflow secret:
   - Go to: Repository → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `PLAYWRIGHT_AUTH_STATE`
   - Value: Contents of `web/playwright/.auth/user.json`

3. **Update workflow** to use secret:
   ```yaml
   - name: Restore auth from secret
     run: |
       mkdir -p playwright/.auth
       echo '${{ secrets.PLAYWRIGHT_AUTH_STATE }}' > playwright/.auth/user.json
   ```

**Pros:** Simple, works with MFA
**Cons:** Manual refresh every 1-2 weeks when tokens expire

### Option 2: Azure Service Principal (Recommended for Production CI/CD)

1. **Create Service Principal:**
   ```bash
   az ad sp create-for-rbac --name "playwright-ci-user" \\
     --role contributor \\
     --scopes /subscriptions/{subscription-id}
   ```

2. **Assign App Role:**
   - Go to Azure Portal → Azure AD → App Registrations
   - Find your CTN app registration
   - Add service principal to "SystemAdmin" or "AssociationAdmin" role

3. **Store credentials as secrets:**
   - `AZURE_CLIENT_ID`
   - `AZURE_CLIENT_SECRET`
   - `AZURE_TENANT_ID`

4. **Create auth script for CI:**
   ```javascript
   // scripts/ci-auth.js
   const { ClientSecretCredential } = require('@azure/identity');
   const { chromium } = require('playwright');

   async function ciAuth() {
     // Authenticate with service principal
     // Capture session without MFA requirement
   }
   ```

**Pros:** Automated, no MFA, no manual refresh
**Cons:** More complex setup, requires Azure AD configuration

### Option 3: GitHub OIDC with Azure AD (Enterprise)

Use GitHub's OIDC provider to federate with Azure AD:

1. **Configure OIDC:**
   ```bash
   az ad app federated-credential create \\
     --id $APP_ID \\
     --parameters credential.json
   ```

2. **Update workflow:**
   ```yaml
   permissions:
     id-token: write
     contents: read

   - name: Azure Login with OIDC
     uses: azure/login@v1
     with:
       client-id: ${{ secrets.AZURE_CLIENT_ID }}
       tenant-id: ${{ secrets.AZURE_TENANT_ID }}
       subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
   ```

**Pros:** No secrets stored, most secure, fully automated
**Cons:** Complex setup, requires Azure AD Premium

### Option 4: Skip Auth in CI (Testing Only)

For testing the pipeline without auth:

```yaml
- name: Run tests without auth
  run: npm run test:e2e -- --grep-invert @requires-auth
```

Mark auth-required tests:
```typescript
test('should authenticate @requires-auth', async ({ page }) => {
  // ...
});
```

**Pros:** Simple for testing pipeline
**Cons:** Doesn't test actual authenticated flows

## Current Configuration

The workflow is currently configured to:
1. ✅ Check for auth state in cache
2. ✅ Skip tests gracefully if no auth found
3. ✅ Upload test reports and screenshots
4. ✅ Comment on PRs with results

## Security Best Practices

- ✅ `playwright/.auth/user.json` is in `.gitignore`
- ✅ No secrets committed to repository
- ✅ Auth tokens expire after 1-2 weeks
- ✅ Workflow checks for exposed secrets

## Triggering Workflows

**Automatic triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Only when files in `web/` change

**Manual trigger:**
```bash
# Via GitHub UI
Repository → Actions → Playwright E2E Tests → Run workflow

# Via gh CLI
gh workflow run playwright-tests.yml
```

## Monitoring

**View test results:**
- Actions tab → Workflow run → Artifacts
- Download `playwright-report` for HTML report
- Download `playwright-screenshots` for failure screenshots

**Test results in PRs:**
- Automated comment with pass/fail status
- Link to full report
- Failure screenshots attached

## Troubleshooting

### Tests failing with 401 errors
**Cause:** Auth tokens expired
**Solution:** Recapture auth state and update secret/cache

### Tests timing out
**Cause:** Slow network or overloaded runners
**Solution:** Increase `timeout-minutes` in workflow or test configuration

### Auth cache not found
**Cause:** Cache miss or first run
**Solution:** Set up auth using one of the options above

### Browser installation fails
**Cause:** Missing dependencies on runner
**Solution:** Use `npx playwright install --with-deps`

## Cost Considerations

**GitHub Actions minutes:**
- Free tier: 2,000 minutes/month
- Ubuntu runner: 1x multiplier
- Typical test run: 5-10 minutes

**Storage:**
- Test reports: Kept for 30 days
- Screenshots: Kept for 7 days

## Next Steps

1. ✅ Choose authentication option (Option 1 recommended for start)
2. ✅ Set up secrets in GitHub repository
3. ✅ Test workflow manually
4. ✅ Configure PR requirements (optional)

## Resources

- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Playwright CI Guide](https://playwright.dev/docs/ci)
- [Azure OIDC with GitHub](https://docs.microsoft.com/azure/active-directory/develop/workload-identity-federation)
