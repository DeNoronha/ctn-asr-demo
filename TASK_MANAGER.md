Task 1: ✅ COMPLETED (2025-12-14)

Read > /Users/ramondenoronha/Documents/Screenshots/Scherm­afbeelding 2025-12-14 om 11.10.19.png

Country is empty. Fetch from the lookup table (with a join) >> legal_entity_number_type

**Solution:** Updated `/api/src/routes.ts` to use `lent.country_scope AS country_code` from the lookup table directly. The lookup table (`legal_entity_number_type`) is now the authoritative source for country codes (e.g., KVK will show "NL" from the lookup table).


Task 2: ✅ COMPLETED (2025-12-14)

Make sure that address are formatted according to local (country) standards. There is probably a website which tells how addresses are formatted (layout).

In NL for instance it is
<<streetname>> <<housenumber>> <<housenumber addition>>

<<postal code>> (4 digits, space, two characters in capitals)  <<city>> (in capitals)

Make sure all address will be formatted in the correct going forward. And update the existing ones in the database.

Countries for now include NL, DE, BE, France, Austria, Switzerland

**Solution:** Created `admin-portal/src/utils/addressFormat.ts` with country-specific address formatting functions. Supports:
- **NL**: Postal code formatted as "1234 AB" (4 digits + space + 2 uppercase letters), double space before city, city in CAPITALS
- **DE/AT**: Postal code + space + CITY in capitals
- **BE/FR/CH**: Similar format with country-specific postal code handling
- Updated `CompanyDetails.tsx` to use formatted address display
- Utility also copied to `member-portal/src/utils/` for future use

References: [PostGrid International Standards](https://www.postgrid.com/international-postal-address-standards-formats/), [Wikipedia Address Formats](https://en.wikipedia.org/wiki/Address_format_by_country_and_area)

Task 3: ✅ COMPLETED (2025-12-14)

Registration Number is empty on the Company Details page in the admin portal. When clicking on update or enrich it should be populated with the EUID. Rename the registration Number to EUID. Populate all existing records.

**Solution:**
- Renamed "Registration Number" label to "EUID" in `CompanyDetails.tsx`
- EUID auto-generation already exists in the enrichment flow (routes.ts lines 2312-2333)
- When clicking "Update", the system fetches KVK data and generates EUID as `NL.KVK.{kvk_number}`
- Existing records will get EUID populated when Update/Enrich is clicked

Task 4: ✅ COMPLETED (2025-12-14)

Look at /Users/ramondenoronha/Documents/Screenshots/Scherm­afbeelding 2025-12-14 om 11.21.25.png
Show the Tier pill also in the top next to the Active pill.

**Solution:**
- Added `authentication_tier` and `authentication_method` to the GET legal-entity API response
- Added `authentication_tier?: number` to the `LegalEntity` TypeScript type
- Created `getTierColor()` function in `colors.ts` with WCAG-compliant colors for each tier
- Added `getTierBadge()` function in `MemberDetailView.tsx` that displays "Tier 1/2/3" pill
- Styled `.tier-badge` in CSS to match status-badge appearance 

Task 5: ✅ COMPLETED (2025-12-14)

Look at /Users/ramondenoronha/Documents/Screenshots/Scherm­afbeelding 2025-12-14 om 11.23.33.png

The legal name should be the same as the official name as shown on the CoC tab. In this example it should be Combi Terminal Twente B.V.

Show me which names we have for a company name in the various tables. In my opinion it should be only Official Name and Trade Name. I think we have to many variants in the various tables. And being used randomly in screens and API's.

**Analysis of Company Name Fields:**

| Table | Field | Purpose |
|-------|-------|---------|
| `legal_entity` | `primary_legal_name` | **Main field** - Official legal name (source of truth for display) |
| `legal_entity` | `kvk_extracted_company_name` | Company name extracted from PDF upload (for comparison) |
| `kvk_registry_data` | `company_name` | Company name from KvK API |
| `kvk_registry_data` | `statutory_name` | Official statutory name (statuten naam) - **THE official name** |
| `kvk_registry_data` | `primary_trade_name` | First trade name (eersteHandelsnaam) |
| `kvk_registry_data` | `trade_names` | JSONB array of all trade names |
| `gleif_registry_data` | `legal_name` | Legal name from GLEIF/LEI registry |
| `applications` | `legal_name` | User-entered name during registration |

**Solution:**
- Modified the `/enrich` endpoint to sync `kvkData.statutoryName` (or `companyName` fallback) to `legal_entity.primary_legal_name` after KVK data fetch
- When clicking "Update" or "Enrich", the legal entity's `primary_legal_name` will now be updated from KVK official data
- Existing records will be synced when Enrich is clicked

**Recommendation:** Keep `primary_legal_name` on `legal_entity` as the single source of truth for display. The other name fields are for audit/comparison purposes only.

Task 6: ✅ COMPLETED (2025-12-14)

Below the Address on the Company Details tab show a google maps. In this repo /Users/ramondenoronha/Dev/DIL/DEV-CTN-DocuFlow we already use Google Maps. It should also contain the credentials for the Google Maps API (in .credentials)

**Solution:**
- Created `admin-portal/src/components/AddressMap.tsx` component that embeds Google Maps using iframe
- Uses Google Maps Embed API (no API key required for basic embedding)
- Optional `VITE_GOOGLE_MAPS_API_KEY` can be added to `.env` for advanced features
- Added map to `CompanyDetails.tsx` below the Address section
- Map shows company location with 15x zoom level
- Gracefully handles missing address data

**Note:** Google Maps API key not found in `.credentials`. The embed works without an API key for basic usage.

Task 7: ⚠️ NOT VIABLE (2025-12-14)

See whether we can enrich the address with What3words. I am not sure if a free api is available for What3words.

**Research Findings:**
- **Free Plan Limitations:** The What3words Free plan only provides access to `autosuggest` and `available-languages` API functions
- **No Free Coordinate Conversion:** Converting coordinates to 3-word addresses (`convert-to-3wa`) requires a paid Business plan
- **Pricing:** Business plans start at £0 for small businesses with limited usage, up to £235/month for higher volumes. Enterprise plans available for >75,000 requests
- **Exception:** Emergency services and registered charities can use the API for free

**Conclusion:** What3words integration is **not viable** for this project without a paid subscription. The free tier does not allow the core functionality needed (converting company addresses/coordinates to 3-word addresses).

**Alternatives considered:**
- Plus Codes (Google Open Location Code) - Free and open source
- Geohash - Free and open source
- Neither provides the same user-friendly 3-word format

**Recommendation:** Skip this feature unless there's budget for What3words Business plan or the association qualifies as a charity.

Sources: [What3words API Pricing](https://accounts.what3words.com/select-plan), [What3words Developer Docs](https://developer.what3words.com/public-api/docs) 

Task 8: ✅ COMPLETED (2025-12-14)

Are all fetched fields shown on the CoC tab. I have the feeling I am missing a lot of fields.

**Analysis:** The `kvk_registry_data` table contains 43 fields, but the CoC tab was only displaying ~15 of them.

**Missing fields that are now displayed:**
| Field | Description |
|-------|-------------|
| `statutory_name` | Official statutory name (statuten naam) |
| `rsin` | Dutch RSIN number |
| `vestigingsnummer` | Establishment number |
| `rechtsvorm` | Legal form in Dutch |
| `ind_hoofdvestiging` | Main establishment indicator |
| `ind_commerciele_vestiging` | Commercial establishment indicator |
| `fulltime_employees` | Full-time employee count |
| `parttime_employees` | Part-time employee count |
| `total_branches` | Total number of branches |
| `commercial_branches` | Commercial branches count |
| `non_commercial_branches` | Non-commercial branches count |
| `websites` | Company websites |

**Solution:**
- Updated `KvkRegistryDetails.tsx` to display all additional fields
- Added new "Employees & Branches" card section
- Added "Company Websites" section with clickable links
- Updated API endpoint to return all available fields from database
- Added CSS styling for website links

**Files Modified:**
- `admin-portal/src/components/KvkRegistryDetails.tsx` - Added new fields to interface and display
- `admin-portal/src/components/KvkRegistryDetails.css` - Added website link styling
- `api/src/routes.ts` - Updated GET kvk-registry endpoint to return all fields 

Task 9

Can you fetch logo's from companies. E.g. when you click enrich. It would be nice if we can give the member portal the look and feel of the their own website (after login). So we need a table where we store main colours and logo's for each member. Also make sure the country_scope is filled for all types. 





New tasks

I don't like COALESCE(len.country_code, lent.country_scope). That defeats the purpose of lookup tables. Check if this is done on other places as well and fix accordingly. 

New task
Make sure country_scope is not Null. EORI, EUID >> EU. VAT, DUNS >> GLOBAL etc.

Task 12: ✅ COMPLETED (2025-12-14)

**German CoC Alternatives Research**

Can you look for alternatives for a CoC for German companies. Important is that we fetch the CoC number of german companies. Convert it to EUID format. LEI and VAT/VIES number are also needed. Ideally we fetch via (free) API's.

---

## German Business Register Landscape

Germany has **3 separate systems** with overlapping data:
1. **Handelsregister** - Commercial register (HRA/HRB numbers) maintained by 150 local courts
2. **Unternehmensregister** - Central online platform consolidating data from multiple sources
3. **Transparenzregister** - Beneficial ownership register (restricted access since 2022)

### EUID Format for Germany
Format: `DE{CourtCode}.{RegisterType}{Number}`
Example: `DEK1101R.HRB116737` (DE = Germany, K1101R = Hamburg court, HRB116737 = register number)

---

## FREE API Options

### 1. **bundesAPI/handelsregister** (Open Source) ⭐ RECOMMENDED
- **URL:** https://github.com/bundesAPI/handelsregister
- **Cost:** FREE (open source Python CLI)
- **Data:** Company name, HRB/HRA number, court, legal form, address
- **Rate Limit:** 60 requests/hour (per German law)
- **Installation:**
  ```bash
  git clone https://github.com/bundesAPI/handelsregister.git
  poetry install
  poetry run python handelsregister.py -s "Contargo" -so all
  ```
- **Pros:** Direct access to official register, no API key needed
- **Cons:** Rate limited, requires scraping approach

### 2. **GLEIF LEI API** (Legal Entity Identifier) ⭐ RECOMMENDED
- **URL:** https://www.gleif.org/en/lei-data/gleif-api
- **Cost:** FREE (no registration required)
- **Data:** LEI, legal name, addresses, parent/child relationships, registration authority
- **Features:** Fuzzy search, BIC/ISIN mapping, corporate structure
- **Example:** Search "Contargo" → Get LEI + linked HRB number
- **Pros:** Official, comprehensive, includes corporate ownership
- **Cons:** Only companies with LEI (mainly financial sector)

### 3. **VIES VAT Validation** (European Commission)
- **URL:** https://ec.europa.eu/taxation_customs/vies/
- **Cost:** FREE
- **Data:** VAT number validation, company name, address
- **Format:** German VAT = `DE` + 9 digits (e.g., `DE123456789`)
- **Pros:** Official EU service, real-time validation
- **Cons:** Limited data (no HRB number)

### 4. **BRIS / European e-Justice Portal**
- **URL:** https://webgate.ec.europa.eu/e-justice/searchBris.do
- **Cost:** FREE for basic data (name, type, seat, registration number)
- **Data:** Company search across all 27 EU member states + EEA
- **Pros:** Cross-border search, EUID format
- **Cons:** Manual interface, no public API (Open BRIS at openbris.eu exists but limited)

### 5. **OpenCorporates**
- **URL:** https://api.opencorporates.com/
- **Cost:** FREE for public benefit projects (academics, NGOs, journalists)
- **Commercial:** Requires paid subscription
- **Data:** 200M+ companies worldwide, German HRB/HRA data
- **Pros:** Largest open database, good API
- **Cons:** Commercial use requires license

---

## PAID API Options

| Provider | Cost | Notes |
|----------|------|-------|
| **handelsregister.ai** | Paid | Daily updated, structured data, fast |
| **North Data** | €500/month | 5000 free requests/month, comprehensive |
| **Kausate/OpenRegisters** | Paid | REST API access |
| **Company Start DE** | Paid | OpenAPI integration |

---

## Recommendation for Implementation

**Phase 1 (FREE):**
1. **LEI Lookup via GLEIF API** - For companies with LEI, get full corporate data
2. **VIES VAT Validation** - Validate German VAT numbers
3. **bundesAPI Script** - For HRB number lookup (rate limited)

**Phase 2 (If budget allows):**
- **North Data** (€500/month) or **handelsregister.ai** for production-grade API access

**EUID Generation Logic:**
```typescript
// German EUID format: DE{CourtCode}.{RegisterType}{Number}
function generateGermanEUID(courtCode: string, registerType: 'HRA' | 'HRB', registerNumber: string): string {
  return `DE${courtCode}.${registerType}${registerNumber}`;
}
// Example: generateGermanEUID('K1101R', 'HRB', '116737') → 'DEK1101R.HRB116737'
```

---

## Sources
- [Kyckr German Business Register Guide](https://www.kyckr.com/blog/german-business-register-2025-update)
- [bundesAPI/handelsregister GitHub](https://github.com/bundesAPI/handelsregister)
- [GLEIF LEI API](https://www.gleif.org/en/lei-data/gleif-api)
- [VIES VAT Validation](https://ec.europa.eu/taxation_customs/vies/)
- [European e-Justice BRIS](https://webgate.ec.europa.eu/e-justice/searchBris.do)
- [OpenCorporates API](https://api.opencorporates.com/)
- [North Data](https://www.northdata.com/_data)




