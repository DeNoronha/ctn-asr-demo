# Blob Storage Authentication Troubleshooting

**Error:** "Server failed to authenticate the request"

## Root Cause

Azure Blob Storage requires **SAS (Shared Access Signature) tokens** for private containers. The error occurs when accessing a blob without a valid SAS token.

## Understanding SAS Tokens

**Valid SAS URL format:**
```
https://stctnasrdev96858.blob.core.windows.net/kvk-documents/[path]?
  sv=2025-11-05&              # API version
  st=2025-11-21T21:36:42Z&    # Start time
  se=2025-11-21T22:36:42Z&    # Expiry time (60 minutes)
  sr=b&                        # Resource type (blob)
  sp=r&                        # Permissions (read)
  sig=...                      # Signature
```

**WITHOUT SAS token (FAILS):**
```
https://stctnasrdev96858.blob.core.windows.net/kvk-documents/[path]
❌ Error: Server failed to authenticate the request
```

## Common Causes & Solutions

### 1. SAS Token Expired ⏰

**Symptom:** Document was accessible before, now shows authentication error

**Why:** SAS tokens expire after 60 minutes

**Solution:**
- Refresh the admin portal page
- API will generate a new SAS token
- Click "View Document" again

### 2. Accessing Blob URL Directly 🔗

**Symptom:** Copied blob URL from database/logs and pasted in browser

**Why:** Database stores the blob URL WITHOUT SAS token for security

**Solution:**
- Don't access blob URLs directly from database
- Always use the admin portal "View Document" button
- API adds SAS token automatically

### 3. Browser Cache 🗂️

**Symptom:** Getting auth error even after page refresh

**Why:** Browser cached the URL without SAS token

**Solution:**
```
1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Or open in Incognito/Private window
3. Or clear browser cache
```

### 4. API Not Generating SAS Token ⚙️

**Symptom:** API response has `kvk_document_url` but WITHOUT query parameters

**Check API response:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://ca-ctn-asr-api-dev.../api/v1/legal-entities/{id}/kvk-verification
```

**Expected:**
```json
{
  "kvk_document_url": "https://...?sv=2025-11-05&st=...&se=...&sig=..."
}
```

**If missing SAS params:** Check Container App logs for errors

### 5. Missing Storage Connection String 🔑

**Symptom:** API error: "Invalid Azure Storage connection string"

**Check Container App environment variables:**
```bash
az containerapp show --name ca-ctn-asr-api-dev \
  --resource-group rg-ctn-demo-asr-dev \
  --query "properties.template.containers[0].env[?name=='AZURE_STORAGE_CONNECTION_STRING']"
```

**Solution:** Ensure `AZURE_STORAGE_CONNECTION_STRING` is configured in Container App

## Testing SAS Token Generation

**Test from command line:**
```bash
# 1. Get authentication token
TOKEN=$(curl -X POST "https://login.microsoftonline.com/598664e7-725c-4daa-bd1f-89c4ada717ff/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=d3037c11-a541-4f21-8862-8079137a0cde" \
  -d "scope=api://d3037c11-a541-4f21-8862-8079137a0cde/.default" \
  -d "username=test-e2@denoronha.consulting" \
  -d "password=Madu5952" \
  -d "grant_type=password" | jq -r '.access_token')

# 2. Call API
curl -H "Authorization: Bearer $TOKEN" \
  https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api/v1/legal-entities/8fc8562b-96d5-4a97-9195-a8682abefe85/kvk-verification

# 3. Check if kvk_document_url has SAS parameters (sv, st, se, sig)
```

## Verifying Document Access

**Test the SAS URL:**
```bash
# Extract kvk_document_url from API response
KVK_URL="https://stctnasrdev96858.blob.core.windows.net/kvk-documents/...?sv=...&sig=..."

# Test access
curl -I "$KVK_URL"

# Expected: HTTP/1.1 200 OK
# If 403: SAS token invalid or expired
```

## Security Notes

**Why we use SAS tokens:**
- ✅ Time-limited access (60 minutes)
- ✅ Read-only permissions
- ✅ Blob-scoped (cannot list other files)
- ✅ No public access to container

**Database security:**
- Blob URLs stored WITHOUT SAS tokens
- SAS tokens generated on-demand
- Prevents token theft from database breach

## Quick Checklist for Tomorrow Morning

When testing LK Holding document:

1. ✅ **Fresh page load** - Open admin portal (not cached page)
2. ✅ **Navigate to Document Verification tab**
3. ✅ **Check Network tab** - Verify API returns SAS URL
4. ✅ **Click View Document** - Should open PDF
5. ✅ **Check blob URL** - Should have ?sv=...&sig=... parameters

**If it fails:**
- Open browser DevTools (F12)
- Go to Console tab
- Look for errors
- Check Network tab for failed requests
- Share error message with me

## Expected Behavior

**✅ Working:**
```
User clicks "View Document"
  ↓
Admin portal calls: /api/v1/legal-entities/{id}/kvk-verification
  ↓
API queries database for blob URL
  ↓
API generates SAS token (60-min expiry)
  ↓
API returns: { "kvk_document_url": "https://...?sv=...&sig=..." }
  ↓
Browser opens URL in new tab
  ↓
PDF loads successfully
```

**❌ Failing (old behavior):**
```
User clicks "View Document"
  ↓
Frontend tries to open blob URL directly (no SAS)
  ↓
Azure Storage rejects: 403 "Server failed to authenticate"
  ↓
User sees error page
```

---

**Status:** ✅ Fixed as of commit 6d055de
**Deployed:** Build 1376 (20251121.20)
**Tested:** Test Engineer confirmed working (see test report)

Sleep well! 😴
