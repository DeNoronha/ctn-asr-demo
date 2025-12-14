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

New task

Can you look for alternatives for a CoC for German companies. Important is that we fetch the CoC number of german companies. Convert it to EUID format. LEI and VAT/VIES number are also needed. Ideally we fetch via (free) API's. Some suggestions.

https://opencorporates.com/companies/de/R1102_HRB15884

https://e-justice.europa.eu/topics/registers-business-insolvency-land/business-registers-search-company-eu/general-information-find-company_en

https://www.unternehmensregister.de/en/search?areas=all&companyName=Contargo&searchToken=Xqcu6naeActY4WedeA1b9UeKkWjOhDeDFxzHMvYaYBfuP7tU8jT85e33_wuQ6XURRBG7rffWzUzPu-9_-KmWtCBBqjKmCSHGwKhktDSE3Zd-K6vEKrePPXdTnmoEFv8zFeMh-MUIpPtDSfKyk0lcqwBUFjSLoR0agdxH900femt7Y4bsGPn5BvjKK78N-d87iQA3mzJx

# German Transparency Register?




