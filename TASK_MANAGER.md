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

Task 14:

Don't start a build manually before checking if a build is still running. Put this in CLAUDE.md

---

Task 15:

Fetching a VAT number in NL can be done via RSIN. But in Germany it might be returned via the BundesAPI. Hence the logic RSIN --> VAT accommodate that. Aka RSIN is not mandatory for non-NL companies

---

Task 16:

If LEI Found: HD52L5PJVBXJUUX8I539 then also fetch all other info of GLEIF registry. This error/message should not occur>> LEI identifier exists but detailed registry data has not been fetched yet.

If LEI number is fetched/updated always fetch the detailed registry data

---

Task 17

GLEIF and bundesAPI are separate registries. Not fall-backs for each other. Each can be searched via a CoC number or via a Name (+address/city).

---

Task 18

Make sure that verifications and enrichments are stored as separate TS services. In order to avoid a huge validator.ts files that no one can decipher.

Task 19:
make sure you can transform a HRB number to an EUID. Look at for instance Contargo Neuss record. HRB known. But no EUID. 
