# Microsoft Graph API Permissions Diagnostic

## Issue
User Management page shows 0 users because Microsoft Graph API permissions aren't configured or consented.

## Required Permissions

The admin portal requires these Microsoft Graph API permissions:
- `User.Read.All` - Read all user profiles
- `User.ReadWrite.All` - Read and write all user profiles
- `Directory.Read.All` - Read directory data

## How to Grant Admin Consent

### Option 1: Azure Portal (Recommended)

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Find your app: **CTN Admin Portal** (Client ID from `.credentials`)
4. Click **API permissions** in left menu
5. Check if these permissions are listed:
   - Microsoft Graph → `User.Read.All` (Application or Delegated)
   - Microsoft Graph → `User.ReadWrite.All` (Delegated)
   - Microsoft Graph → `Directory.Read.All` (Delegated)
6. If missing, click **Add a permission** → **Microsoft Graph** → **Delegated permissions**
   - Search for and add each permission
7. Click **Grant admin consent for [your tenant]**
8. Confirm by clicking **Yes**

### Option 2: Admin Consent URL

Visit this URL (replace CLIENT_ID and TENANT_ID):

```
https://login.microsoftonline.com/{TENANT_ID}/admins/consent?client_id={CLIENT_ID}
```

### Option 3: Use the "Grant Admin Consent" Button

The admin portal has a built-in consent button that should appear if permissions aren't granted. If you don't see it, there may be a bug in the error handling.

## Verify Permissions After Granting

1. In Azure Portal, check that permissions show **Granted for [tenant]** with a green checkmark
2. Refresh the admin portal (Ctrl+F5)
3. Users should now load

## Common Issues

**Consent button doesn't appear:**
- Check browser console for errors
- Error handling may be swallowing the consent_required error

**Still showing 0 users after consent:**
- Clear browser cache/session storage
- Log out and log back in
- Token may be cached without new scopes

**403 Forbidden errors:**
- Verify you're logged in as a Global Administrator or Privileged Role Administrator
- Only these roles can grant tenant-wide admin consent

## Test Graph API Directly

You can test if Graph API works using Graph Explorer:
1. Go to https://developer.microsoft.com/graph/graph-explorer
2. Sign in with your admin account
3. Run: `GET https://graph.microsoft.com/v1.0/users`
4. If this works, the issue is with the admin portal configuration
5. If this fails, Azure AD permissions need to be configured
