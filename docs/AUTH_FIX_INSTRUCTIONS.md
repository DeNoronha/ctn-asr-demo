# Authentication Fix for Portal Data Loading

## Problem Identified
Both portals can authenticate users via Entra ID successfully, but the **admin portal** was not sending authentication tokens with API requests. This caused the API to return 404/401 errors because:

1. The API endpoints require `Authorization: Bearer {token}` headers
2. The admin portal's `apiV2.ts` was not adding these headers
3. The member portal already has this implemented correctly

## Fix Applied

### Admin Portal (web/)
Modified `/Users/ramondenoronha/Dev/DIL/ASR-full/web/src/services/apiV2.ts`:

```typescript
// Added authentication helper functions
async function getAccessToken(): Promise<string | null> {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    const response = await msalInstance.acquireTokenSilent({
      scopes: ['User.Read'],
      account: accounts[0],
    });
    return response.accessToken;
  }
  return null;
}

async function getAuthenticatedAxios() {
  const token = await getAccessToken();
  return axios.create({
    baseURL: API_BASE_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

// Updated critical API methods:
- getMembers() - Now uses authenticated axios
- getMember(orgId) - Now uses authenticated axios
- getLegalEntity(legalEntityId) - Now uses authenticated axios
```

## Build Status
✅ **Admin portal built successfully** at: `/Users/ramondenoronha/Dev/DIL/ASR-full/web/build`

## Manual Deployment Instructions

Since automated deployment is having issues, here's how to manually deploy the fixed admin portal:

### Option 1: Azure Static Web Apps CLI (Recommended)
```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full/web
npx @azure/static-web-apps-cli deploy ./build \\
  --app-name stapp-ctn-demo-asr-dev \\
  --resource-group rg-ctn-demo-asr-dev \\
  --no-use-keychain
```

When prompted, select: **rg-ctn-demo-asr-dev/stapp-ctn-demo-asr-dev**

### Option 2: Azure Portal (Alternative)
1. Open Azure Portal
2. Navigate to: Resource Groups → rg-ctn-demo-asr-dev → stapp-ctn-demo-asr-dev
3. Go to "Deployment" → "Manual deployment"
4. Upload the built files from: `/Users/ramondenoronha/Dev/DIL/ASR-full/web/build`

### Option 3: GitHub Actions (If configured)
```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full
git add web/src/services/apiV2.ts
git commit -m "fix: Add authentication headers to admin portal API requests"
git push
```

The GitHub Action should automatically deploy the admin portal.

## Testing After Deployment

### 1. Clear Browser Cache
**IMPORTANT**: Clear your browser cache or use hard refresh:
- Chrome/Edge: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Firefox: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)

### 2. Test Admin Portal
1. Navigate to: https://calm-tree-03352ba03.1.azurestaticapps.net
2. Login with: ramon@denoronha.consulting
3. You should now see the members list loading
4. Click on a member - legal entity details should load with **international registry identifiers**

### 3. Test Member Portal
1. Navigate to: https://calm-pebble-043b2db03.1.azurestaticapps.net
2. Login with: ramon@denoronha.consulting
3. Member dashboard should now load with your organization data
4. Check "Profile" section - should show **international registry identifiers**

## What to Look For

### Admin Portal (calm-tree)
✅ Members list appears (not empty table)
✅ Clicking a member shows legal entity details
✅ "Identifiers" tab shows international registry identifiers (KvK, LEI, EUID, etc.)
✅ No more 404 errors in browser console

### Member Portal (calm-pebble)
✅ Dashboard shows organization name and details
✅ Profile section shows registry identifiers with country codes
✅ No more 404 errors on /api/v1/member

## Browser Console Debugging

If still seeing issues, open browser console (F12) and check:

### Before Fix (Expected Errors):
```
Failed to load resource: the server responded with a status of 404 (Not Found)
Error: API error: 404
```

### After Fix (Should See):
```
✓ 200 GET /api/v1/members
✓ 200 GET /api/v1/member
✓ 200 GET /api/v1/legal-entities/{id}
```

##Current State

### API Status: ✅ WORKING
- All essential endpoints deployed
- Authentication properly configured
- Database connected and responding
- International registry support active

### Admin Portal Status: ⚠️ NEEDS DEPLOYMENT
- Code fixed and built
- Ready to deploy
- Instructions provided above

### Member Portal Status: ✅ SHOULD WORK
- Already has auth token logic
- No changes needed
- Should work once API is accessible

## Troubleshooting

### If member data still doesn't load after deployment:

1. **Check API is responding:**
   ```bash
   curl -s "https://func-ctn-demo-asr-dev.azurewebsites.net/api/health" | jq '.status'
   # Should return: "healthy"
   ```

2. **Check authentication in browser console:**
   - Open DevTools → Network tab
   - Reload page
   - Find request to `/api/v1/members` or `/api/v1/member`
   - Check "Headers" section
   - Should see: `Authorization: Bearer eyJ0...` (long token)

3. **Check member exists in database:**
   ```bash
   # Contact me if you need to verify member data exists
   ```

4. **Check CORS is allowing the request:**
   - Look for CORS errors in console
   - API is configured to allow both portal origins

## Next Steps for Demo

1. **Deploy the admin portal** using one of the options above
2. **Test both portals** with a hard refresh
3. **Verify international registries display** correctly
4. **Test the demo flow:**
   - Admin logs in → sees member list → clicks member → sees full details with international registries
   - Member logs in → sees their dashboard → checks profile → sees their registry identifiers

## Files Modified
- `/Users/ramondenoronha/Dev/DIL/ASR-full/web/src/services/apiV2.ts` - Added authentication
- **Build artifacts ready** at: `/Users/ramondenoronha/Dev/DIL/ASR-full/web/build`

## Contact
If you need help with deployment or encounter issues, check:
1. Browser console for specific errors
2. Network tab to see which API calls are failing
3. The docs/API_DEPLOYMENT_FIX.md file for API endpoint details

**The fix is ready - it just needs to be deployed!** 🚀
