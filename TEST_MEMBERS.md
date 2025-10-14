# Testing Members List Issue

## Problem
You can login but see no members in the admin portal.

## What We Know
✅ API is deployed and working (health check passes)
✅ GetMembers function is deployed
✅ You have SystemAdmin role assigned
✅ Admin portal has authentication code deployed
❌ Members list shows empty

## Need to Check

### 1. Browser Console Check
**Please open the admin portal in incognito and:**

1. Press F12 to open Developer Tools
2. Go to **Console** tab
3. Look for any red errors - copy them here
4. Go to **Network** tab
5. Reload the page
6. Find the request to `members` or `v1/members`
7. Click on it and check:
   - **Status Code**: What number? (200, 401, 403, 404, 500?)
   - **Headers** tab → Request Headers → Look for `authorization`
   - **Response** tab → What does it say?

### 2. Possible Issues

**Issue A: API Returning 401 (Unauthorized)**
- Means: Token not being sent OR invalid
- Fix: Check if axios is actually sending Authorization header

**Issue B: API Returning 403 (Forbidden)**
- Means: Token sent but user doesn't have required role
- Fix: Role claims not in token (we verified role is assigned)

**Issue C: API Returning 404**
- Means: Endpoint not found OR middleware rejecting before reaching handler
- Fix: Check essential-index.ts is deployed

**Issue D: API Returning 200 with Empty Array**
- Means: No members in database
- Fix: Need to create test members

**Issue E: API Returning 200 with Data but UI Not Showing**
- Means: Frontend issue
- Fix: Check apiV2.ts response handling

### 3. Quick Test

**From your browser console on the admin portal**, paste this:

```javascript
// Test if API is accessible
fetch('https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/members', {
  headers: {
    'Authorization': 'Bearer ' + (await window.msalInstance?.acquireTokenSilent({scopes: ['User.Read'], account: window.msalInstance?.getAllAccounts()[0]}))?.accessToken
  }
})
.then(r => r.json())
.then(d => console.log('API Response:', d))
.catch(e => console.error('API Error:', e));
```

This will tell us exactly what the API is returning.

### 4. Alternative: Use Azure Portal

If API testing is difficult, you can:
1. Go to Azure Portal
2. Navigate to Function App: func-ctn-demo-asr-dev
3. Go to "Functions" → "GetMembers"
4. Click "Test/Run"
5. See what it returns

This will test the function directly without authentication.

## What I'll Do Next

Once you tell me:
- The HTTP status code you're seeing
- Any console errors
- The response from the API

I can immediately fix the specific issue!
