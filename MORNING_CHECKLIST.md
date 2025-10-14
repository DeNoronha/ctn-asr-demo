# Morning Demo Checklist - October 14, 2025

## ✅ What's Already Done (You Can Sleep!)

- ✅ API deployed with 16 working endpoints
- ✅ Database migrations applied (BDI + International registries)
- ✅ Admin portal deployed with authentication fix
- ✅ Member portal ready
- ✅ You have SystemAdmin role assigned
- ✅ International registry support fully implemented

## 🌅 Quick Morning Test (5 minutes)

### Step 1: Test Admin Portal
1. Open: https://calm-tree-03352ba03.1.azurestaticapps.net
2. Login: ramon@denoronha.consulting
3. **Expected:** You should see members list

### Step 2: Test Member Portal
1. Open: https://calm-pebble-043b2db03.1.azurestaticapps.net
2. Login: ramon@denoronha.consulting
3. **Expected:** You should see your organization dashboard

## ❓ If Still No Members

### Option A: Create Test Member via API (30 seconds)
```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full
# Script will be ready in CREATE_TEST_MEMBER.sh
bash CREATE_TEST_MEMBER.sh
```

### Option B: Use Azure Portal (1 minute)
1. Go to portal.azure.com
2. Navigate to: psql-ctn-demo-asr-dev
3. Go to Databases → asr_dev → Query editor
4. Run the SQL from: /Users/ramondenoronha/Dev/DIL/ASR-full/CREATE_TEST_MEMBERS.sql

### Option C: Call Me
If nothing works, the issue is likely:
1. No members in database → Run CREATE_TEST_MEMBERS.sql
2. Auth token not being sent → Check browser console for 401/403
3. API function not responding → Restart Function App

## 📋 Demo Script (Ready to Go)

### Introduction (1 min)
"This is the CTN Association Register - our member identity and trust management system."

### Show Admin Portal (2 min)
1. "Here's where we manage all association members"
2. Click a member → "We can see complete organization details"
3. Click "Identifiers" tab → "Key feature: international registry support"
4. "Organizations can have KvK, LEI, German Handelsregister, French SIREN, UK Companies House"
5. "Each identifier includes country, registry name, validation status"

### Show Member Portal (2 min)
1. "This is the member's self-service view"
2. "Members see their own organization profile"
3. Show Profile → "They can view all their registered identifiers"
4. "Critical for cross-border trade - one company, multiple registrations"

### Show BDI Integration (1 min)
1. "We're implementing BDI Reference Architecture"
2. "We generate BVAD tokens - verifiable assurance documents"
3. "These JWT tokens include all registry identifiers"
4. "Other systems can verify member identity using these tokens"

## 🔧 Emergency Fixes

### If API Doesn't Respond
```bash
az functionapp restart --name func-ctn-demo-asr-dev --resource-group rg-ctn-demo-asr-dev
# Wait 2 minutes, then test
```

### If Portals Don't Load
```bash
# Hard refresh browser
# Windows: Ctrl + Shift + R
# Mac: Cmd + Shift + R
```

### If Authentication Fails
- Check you're using: ramon@denoronha.consulting
- Try incognito/private mode
- Logout and login again

## 📞 URLs

- **Admin Portal:** https://calm-tree-03352ba03.1.azurestaticapps.net
- **Member Portal:** https://calm-pebble-043b2db03.1.azurestaticapps.net
- **API Health:** https://func-ctn-demo-asr-dev.azurewebsites.net/api/health
- **Pipeline:** https://dev.azure.com/ctn-demo/ASR/_build

## ✨ You're Ready!

Everything is deployed and configured. If you see an empty members list in the morning:
1. Run CREATE_TEST_MEMBERS.sql (takes 30 seconds)
2. Refresh the portal
3. Demo time! 🎉

**Get some sleep - you've got this!** 😴
