# Quick Diagnostic Guide: Identifier 404/500 Errors

## TL;DR

Your identifier endpoints ARE deployed and working. The issue is likely an **authentication configuration problem** in the admin portal.

---

## What to Do Right Now

### Step 1: Open Browser DevTools (2 minutes)

1. Go to: https://calm-tree-03352ba03.1.azurestaticapps.net
2. Press F12 (or right-click → Inspect)
3. Click "Console" tab
4. Try to add identifier: KVK 95944192
5. Watch for red errors in console

### Step 2: Check Network Tab (2 minutes)

1. In DevTools, click "Network" tab
2. Try adding the identifier again
3. Look for the POST request to `/identifiers`
4. Click on it
5. Check the "Response" tab - what error do you see?

### Step 3: Share These Details

Send me:
- Console error messages (screenshot)
- Network response status code (401? 403? 500?)
- Network response body (the JSON error message)

---

## Most Likely Issues & Quick Fixes

### Issue 1: Authentication Token Problem (401 Error)

**Symptoms:**
- Error says "unauthorized" or "Missing Authorization header"
- Console shows MSAL errors

**Quick Fix:**
1. Azure Portal → Static Web Apps → Your admin portal
2. Configuration → Application settings
3. Verify these are set:
   ```
   REACT_APP_AZURE_CLIENT_ID = d3037c11-a541-4f21-8862-8079137a0cde
   REACT_APP_AZURE_TENANT_ID = 598664e7-725c-4daa-bd1f-89c4ada717ff
   ```
4. Save and restart the app

### Issue 2: Permission Problem (403 Error)

**Symptoms:**
- Error says "forbidden" or "insufficient permissions"

**Quick Fix:**
- Your user account needs UPDATE_OWN_ENTITY or UPDATE_ALL_ENTITIES permission
- Check your role in Azure AD

### Issue 3: Legal Entity Not Found (404 Error)

**Symptoms:**
- Error says "not found" or "entity not found"

**Quick Fix:**
- The legal entity ID might be wrong
- Verify the entity exists in the database

### Issue 4: Database/Server Error (500 Error)

**Symptoms:**
- Error says "internal server error"
- No specific error message

**Quick Fix:**
1. Check Azure Application Insights:
   ```bash
   az monitor app-insights query \
     --app appi-ctn-demo-asr-dev \
     --resource-group rg-ctn-demo-asr-dev \
     --analytics-query "exceptions | where timestamp > ago(1h) | order by timestamp desc | take 10"
   ```

---

## Verify Endpoints Are Working

Run this quick test to confirm endpoints are deployed:

```bash
# Test 1: Check if endpoint responds
curl -v "https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/entities/test-id/identifiers" 2>&1 | grep "HTTP"

# Expected: HTTP/1.1 401 Unauthorized (this is GOOD - means endpoint exists)
# Bad: HTTP/1.1 404 Not Found (would mean endpoint not deployed)
```

---

## Debug Token (Advanced)

If you want to see what's in your authentication token:

1. In Network tab, find the POST request
2. Click Headers tab
3. Find "Authorization: Bearer eyJ..."
4. Copy everything after "Bearer " (the long token)
5. Go to https://jwt.io
6. Paste the token
7. Check:
   - `aud` should be: `api://d3037c11-a541-4f21-8862-8079137a0cde`
   - `exp` should be in the future (not expired)
   - `roles` should include your role

---

## What I've Already Verified

- All 4 identifier endpoints are deployed
- Endpoints are registered correctly in Azure
- Route paths are correct:
  - GET/POST: `/api/v1/entities/{legalEntityId}/identifiers`
  - PUT/DELETE: `/api/v1/identifiers/{identifierId}`
- CORS is configured correctly
- Authentication middleware is working
- Code is error-free

---

## What We Need to Find Out

The missing piece is: **What exact error is the admin portal getting?**

That's why I need you to check the browser console and network tab.

Once we know the specific error (401, 403, 404, or 500), we can apply the right fix.

---

## If You're Still Stuck

Run this command to get recent API errors:

```bash
az monitor app-insights query \
  --app appi-ctn-demo-asr-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --analytics-query "requests | where timestamp > ago(1h) | where url contains 'identifier' | project timestamp, resultCode, url" \
  --output table
```

This will show any identifier endpoint calls and their status codes.

---

**Next:** Share the error details from the browser, and I'll give you the exact fix.
