Task 13: ✅ COMPLETED (2025-12-14)

/Users/ramondenoronha/Documents/Screenshots/Scherm­afbeelding 2025-12-14 om 13.32.12.png /Users/ramondenoronha/Documents/Screenshots/Scherm­afbeelding 2025-12-14 om 13.32.21.png

Tier 3 is there for Contargo, but it doesn't show up as such on the Dashboard. Wrong field again?

**Root Cause:** The `/v1/members` and `/v1/all-members` API endpoints were not returning the `authentication_tier` field, even though it exists in the `vw_legal_entities` view.

**Solution:**
1. Added `authentication_tier` and `authentication_method` to SELECT statements in both member list endpoints
2. Fixed Dashboard.tsx to handle `authentication_tier` as a number (1, 2, 3) instead of string
3. Updated TIER_COLORS to use "Tier 1", "Tier 2", "Tier 3" labels for the bar chart

**Files Modified:**
- `api/src/routes.ts` - Added authentication_tier to /v1/members and /v1/all-members queries
- `admin-portal/src/components/Dashboard.tsx` - Fixed tier data calculation and colors

---

Task 14: ✅ COMPLETED (2025-12-14)

Don't start a build manually before checking if a build is still running. Put this in CLAUDE.md

**Solution:** Added build check instructions to CLAUDE.md in the "Standard Flow" section:
- Added step 3: Check for running builds with `az pipelines build list`
- Added warning: Never push while another build is running
- Explains risks: deployment conflicts and race conditions

---

Task 15: ✅ COMPLETED (2025-12-14)

Fetching a VAT number in NL can be done via RSIN. But in Germany it might be returned via the BundesAPI. Hence the logic RSIN --> VAT accommodate that. Aka RSIN is not mandatory for non-NL companies

**Analysis:**
- VIES: Can only **validate** existing VAT numbers (not search by name)
- Handelsregister/BundesAPI: Commercial register - does NOT contain VAT data
- GLEIF: LEI data only, no VAT numbers
- For German companies: VAT must be provided manually

**Solution:**
1. Made RSIN enrichment conditional on `countryCode === 'NL'`
2. Updated VAT error messages to be country-specific:
   - NL: "Cannot derive VAT without RSIN (Dutch companies)"
   - Non-NL: "VAT for {country} companies must be provided manually (cannot be auto-derived)"

**Files Modified:**
- `api/src/routes.ts` - Updated enrichment endpoint to skip RSIN for non-NL companies

---

Task 16: ✅ COMPLETED (2025-12-14)

If LEI Found: HD52L5PJVBXJUUX8I539 then also fetch all other info of GLEIF registry. This error/message should not occur>> LEI identifier exists but detailed registry data has not been fetched yet.

If LEI number is fetched/updated always fetch the detailed registry data

**Solution:**
1. Added `storeGleifRegistryData()` function to leiService.ts to store GLEIF registry data
2. Added `fetchLeiByCode()` function to fetch LEI details directly by LEI code
3. Modified enrichment endpoint: When LEI is found during enrichment, GLEIF registry data is now automatically stored
4. Modified LEI registry endpoint: If no GLEIF data exists, it now auto-fetches from GLEIF API on-demand

**Files Modified:**
- `api/src/services/leiService.ts` - Added storeGleifRegistryData() and fetchLeiByCode() functions
- `api/src/routes.ts` - Updated enrichment to store GLEIF data, updated lei-registry endpoint to fetch on-demand

---

Task 17: ✅ COMPLETED (2025-12-14)

GLEIF and bundesAPI are separate registries. Not fall-backs for each other. Each can be searched via a CoC number or via a Name (+address/city).

**Solution:**
1. Updated service header documentation to clarify registry differences
2. Added `searchGleifOnly()` method for LEI-specific searches
3. Added `searchHandelsregisterOnly()` method for German commercial register searches
4. Kept combined `searchByCompanyName()` for backward compatibility (searches both)

**Registry Distinction:**
- GLEIF: Global LEI database (~2M companies with LEIs)
- BundesAPI/Handelsregister.de: German commercial register (all German companies)

**Files Modified:**
- `api/src/services/handelsregisterService.ts` - Added registry-specific search methods

---

Task 18

Make sure that verifications and enrichments are stored as separate TS services. In order to avoid a huge validator.ts files that no one can decipher.

Task 19: ✅ COMPLETED (2025-12-14)

make sure you can transform a HRB number to an EUID. Look at for instance Contargo Neuss record. HRB known. But no EUID.

**Solution:**
When german_registry_data already exists but EUID is missing:
1. Enrichment now checks for existing HRB/HRA identifier
2. Gets court_code from german_registry_data table
3. Generates EUID using `DE{courtCode}.{registerType}{number}` format
4. Example: HRB 15884 at Neuss (D4601R) → DED4601R.HRB15884

**Files Modified:**
- `api/src/routes.ts` - Added EUID generation from existing HRB in enrichment else-branch

---

Task 20:
Push to remote and test thoroughly. 
