# Task Manager

All tasks completed on December 17, 2025.

---

## Task 01: ISO 20275 Entity Legal Forms ✅ COMPLETED

**Request:** Add legal forms code as a lookup list for NL, BE, DACH countries, FR, UK from https://www.gleif.org/en/lei-data/code-lists/iso-20275-entity-legal-forms-code-list

**Solution:**
- Created migration `054_entity_legal_forms.sql`
- Added `entity_legal_forms` table with 479 unique ELF codes
- Added `entity_legal_form_translations` table for multilingual support (EN, NL, DE, FR)
- Covers: NL, BE, DE, AT, CH, FR, GB

---

## Task 02: Google Map Not Showing ✅ COMPLETED

**Request:** Google Map not visible on Company Details page

**Solution:**
- Added `VITE_GOOGLE_MAPS_API_KEY` to `.env` and `.env.production`
- Updated `AddressMap.tsx` to use environment variable instead of hardcoded key
- Added fallback message when API key not configured
- Added key to `.credentials` for reference

---

## Task 03: Datagrid Not Updating After Edit ✅ COMPLETED

**Request:** After editing a company record (e.g., delete identifier) and returning to Members page, the table shows old data

**Solution:**
- Modified `AdminPortal.tsx` `handleBackToMembers` function
- Added `await loadMembersData()` to refresh data when navigating back from detail view

---

## Task 04: KVK → EUID Auto-Generation ✅ COMPLETED

**Request:** Every KVK identifier should also have an EUID (e.g., KVK ID: 24139123)

**Solution:**
- Added `enrichEuid()` function to `nlEnrichmentService.ts`
- Integrated EUID enrichment in enrichment orchestrator (`index.ts`)
- Created migration `055_add_euid_for_kvk_records.sql` to backfill EUID for all existing KVK records
- EUID format: `NL.KVK.{kvkNumber}` (e.g., `NL.KVK.24139123`)
- All 8 existing KVK records now have corresponding EUID

---

## Task 05: GLEIF Registry Data ON CONFLICT Error ✅ COMPLETED

**Request:** Error: "no unique or exclusion constraint matching the ON CONFLICT specification" when fetching GLEIF registry data

**Solution:**
- Created migration `056_add_gleif_unique_constraint.sql`
- Added unique partial index `idx_gleif_registry_unique_legal_entity` on `legal_entity_id`
- Fixed validation_status values from 'GENERATED' to 'VALIDATED' (constraint-compliant)

---

## Task 06: Redesign Members Datagrid ✅ COMPLETED

**Request:** Datagrid columns: ID, Official Name, City, EUID, LEI, Identifiers (pills), Actions. Status column narrower.

**Solution:**
- Created migration `057_add_city_to_view.sql` to add city and country_code to `vw_legal_entities`
- Updated `Member` type to include city and country_code
- Redesigned `MembersGrid.tsx` with new columns:
  - **ID** (80px) | **Official Name** (220px) | **City** (120px) | **EUID** (150px) | **LEI** (190px) | **Identifiers** (180px) | **Status** (85px) | **Actions** (110px)
- Added identifier pills (KVK, VAT, DUNS, EORI) with color coding:
  - **Teal**: Identifier available
  - **Gray**: Not available
- Updated API routes to return city, country_code, and vat fields
- Updated search to include city in filter
- Changed grid key to `members-grid-v3` to reset user column preferences

---

## Files Modified

### Database Migrations
- `054_entity_legal_forms.sql` - ISO 20275 Entity Legal Forms
- `055_add_euid_for_kvk_records.sql` - Backfill EUID for KVK records
- `056_add_gleif_unique_constraint.sql` - GLEIF unique index
- `057_add_city_to_view.sql` - Add city to vw_legal_entities

### API
- `api/src/routes.ts` - Added city, country_code, vat to member queries
- `api/src/services/enrichment/index.ts` - Added EUID enrichment call
- `api/src/services/enrichment/nlEnrichmentService.ts` - Added `enrichEuid()` function
- `api/src/services/enrichment/deEnrichmentService.ts` - Fixed validation_status

### Admin Portal
- `admin-portal/src/components/MembersGrid.tsx` - New column layout with identifier pills
- `admin-portal/src/components/AdminPortal.tsx` - Data refresh on back navigation
- `admin-portal/src/components/AddressMap.tsx` - Environment variable for API key
- `admin-portal/src/services/api/types.ts` - Added city, country_code to Member type
- `admin-portal/.env` - Added VITE_GOOGLE_MAPS_API_KEY
- `admin-portal/.env.production` - Added VITE_GOOGLE_MAPS_API_KEY

### Configuration
- `.credentials` - Added GOOGLE_MAPS_API_KEY



Task 07:
Please check the localizations thorughtout the whole admin portal and member portal. I have selected Deutsch, but it is all in English (mostly). See these screenshots. 

/Users/ramondenoronha/Documents/Screenshots/Scherm­afbeelding 2025-12-17 om 10.42.34.png

/Users/ramondenoronha/Documents/Screenshots/Scherm­afbeelding 2025-12-17 om 10.42.43.png

/Users/ramondenoronha/Documents/Screenshots/Scherm­afbeelding 2025-12-17 om 10.42.48.png

/Users/ramondenoronha/Documents/Screenshots/Scherm­afbeelding 2025-12-17 om 10.43.04.png

Dutch is also not available. 
/Users/ramondenoronha/Documents/Screenshots/Scherm­afbeelding 2025-12-17 om 10.45.25.png



Task 08:

Refine the grid:
/Users/ramondenoronha/Documents/Screenshots/Scherm­afbeelding 2025-12-17 om 10.47.01.png

- City column can be narrower
- Add country code column after city column 
- Status column needs to be a bit wider
- I want also pills for EUID, PEPPOL, VIES
- Pills DUNS and KVK can be hidden
- I dont want to scroll horizontally. Look at the following screenshot. 
  - /Users/ramondenoronha/Documents/Screenshots/Scherm­afbeelding 2025-12-17 om 10.54.23.png



Task 09:
Add a Contargo company located in Germany for which you can find a HRB or HRA number. I want to see how wide a German EUID will be. 


task 10:
Check the current LEI numbers. Are they correct? We changed the logic today.

Task 11:
Is the Peppol ID for LK Holding B.V. correct? Learco told me he never has applied for a Peppol ID
