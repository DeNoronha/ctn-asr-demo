# ADD KVK TO CONTARGO - DO THIS NOW

## Quick 2-Minute Task

Run this script to add KvK number 95944192 to Contargo:

```bash
# 1. Get your auth token
# Open https://calm-tree-03352ba03.1.azurestaticapps.net
# Login, then open DevTools (F12)
# Application tab → Session Storage → find msal token
# Copy the accessToken value

# 2. Set the token
export AUTH_TOKEN='paste-your-token-here'

# 3. Run the script
./add-kvk-to-contargo.sh
```

## What It Does

1. Finds Contargo entity in the database
2. Adds KvK number 95944192 (NL)
3. Sets validation status to PENDING
4. Returns success confirmation

## Expected Output

```
=== Adding KvK Number to Contargo ===

Step 1: Finding Contargo entity...
✅ Found Contargo entity: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

Step 2: Adding KvK number 95944192...
✅ SUCCESS! KvK number added with ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

Identifier details:
{
  "legal_entity_reference_id": "...",
  "legal_entity_id": "...",
  "identifier_type": "KVK",
  "identifier_value": "95944192",
  "country_code": "NL",
  "registry_name": "Dutch Chamber of Commerce (Kamer van Koophandel)",
  "validation_status": "PENDING",
  ...
}

✅ Contargo now has KvK number 95944192!
```

## Verify

After running the script, refresh the admin portal and check Contargo's identifiers. You should see:

| Country | Type | Value | Status |
|---------|------|--------|--------|
| NL | KVK | 95944192 | PENDING |

**This proves the entire identifier CRUD workflow works!** ✅
