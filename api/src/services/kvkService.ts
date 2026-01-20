import axios from 'axios';

// ============================================================================
// KVK API Response Types (based on OpenAPI spec v1.4.0)
// ============================================================================

/**
 * Address structure from KVK API
 */
interface KvKAdres {
  type?: string; // "correspondentieadres" or "bezoekadres"
  indAfgeschermd?: string; // Is address shielded (Ja/Nee)
  volledigAdres?: string; // Complete address string
  straatnaam?: string;
  huisnummer?: number;
  huisletter?: string;
  huisnummerToevoeging?: string;
  toevoegingAdres?: string;
  postcode?: string;
  postbusnummer?: number;
  plaats?: string;
  straatHuisnummer?: string;
  postcodeWoonplaats?: string;
  regio?: string;
  land?: string;
  geoData?: KvKGeoData;
}

/**
 * Geographic data from BAG (Basisregistratie Adressen en Gebouwen)
 */
interface KvKGeoData {
  addresseerbaarObjectId?: string; // Unique BAG id
  nummerAanduidingId?: string; // Unique BAG nummeraanduiding id
  gpsLatitude?: number;
  gpsLongitude?: number;
  rijksdriehoekX?: number; // Dutch coordinate system
  rijksdriehoekY?: number;
  rijksdriehoekZ?: number;
}

/**
 * Trade name structure
 */
interface KvKHandelsnaam {
  naam: string;
  volgorde: number;
}

/**
 * SBI (Standard Industrial Classification) activity
 */
interface KvKSbiActiviteit {
  sbiCode: string;
  sbiOmschrijving: string;
  indHoofdactiviteit: string; // "Ja" or "Nee"
}

/**
 * Material registration dates
 */
interface KvKMaterieleRegistratie {
  datumAanvang?: string; // Start date
  datumEinde?: string; // End date
}

/**
 * Vestiging (Branch/Establishment) structure
 */
interface KvKVestiging {
  vestigingsnummer?: string; // 12-digit branch number
  kvkNummer?: string;
  rsin?: string; // RSIN from vestiging
  indNonMailing?: string;
  formeleRegistratiedatum?: string;
  materieleRegistratie?: KvKMaterieleRegistratie;
  statutaireNaam?: string;
  eersteHandelsnaam?: string; // Primary trade name
  indHoofdvestiging?: string; // Is main branch (Ja/Nee)
  indCommercieleVestiging?: string; // Is commercial (Ja/Nee)
  voltijdWerkzamePersonen?: number; // Full-time employees
  totaalWerkzamePersonen?: number; // Total employees
  deeltijdWerkzamePersonen?: number; // Part-time employees
  handelsnamen?: KvKHandelsnaam[];
  adressen?: KvKAdres[];
  websites?: string[];
  sbiActiviteiten?: KvKSbiActiviteit[];
}

/**
 * Eigenaar (Owner) structure
 */
interface KvKEigenaar {
  rsin?: string; // RSIN from owner/legal entity
  rechtsvorm?: string; // Short legal form (e.g., "BV")
  uitgebreideRechtsvorm?: string; // Extended legal form (e.g., "Besloten Vennootschap")
  adressen?: KvKAdres[];
  websites?: string[];
}

/**
 * Embedded container in Basisprofiel response
 */
interface KvKEmbeddedContainer {
  hoofdvestiging?: KvKVestiging;
  eigenaar?: KvKEigenaar;
}

/**
 * Complete Basisprofiel API response
 * Based on KVK API OpenAPI spec v1.4.0
 */
interface KvKApiResponse {
  kvkNummer: string;
  indNonMailing?: string; // No unsolicited mail preference
  naam: string; // Company name under Maatschappelijke Activiteit
  formeleRegistratiedatum?: string; // Formal registration date
  materieleRegistratie?: KvKMaterieleRegistratie;
  totaalWerkzamePersonen?: number; // Total employees
  statutaireNaam?: string; // Statutory name (when statutes registered)
  handelsnamen?: KvKHandelsnaam[];
  sbiActiviteiten?: KvKSbiActiviteit[];
  _embedded?: KvKEmbeddedContainer;
  _links?: Record<string, { href: string }>;
}

/**
 * VestigingList response (from /vestigingen endpoint)
 */
interface KvKVestigingListResponse {
  kvkNummer: string;
  aantalCommercieleVestigingen?: number;
  aantalNietCommercieleVestigingen?: number;
  totaalAantalVestigingen?: number;
  vestigingen?: Array<{
    vestigingsnummer?: string;
    kvkNummer?: string;
    eersteHandelsnaam?: string;
    indHoofdvestiging?: string;
    indAdresAfgeschermd?: string;
    indCommercieleVestiging?: string;
    volledigAdres?: string;
  }>;
}

// ============================================================================
// KVK Open Data API Types (for status/insolvency info)
// Based on OpenAPI spec v1.1.0 - https://opendata.kvk.nl/api/v1/hvds
// ============================================================================

/**
 * Insolvency codes from Open Data API
 */
export type KvKInsolventieCode = 'FAIL' | 'SSAN' | 'SURS';

/**
 * Open Data API activity structure
 */
interface KvKOpenDataActiviteit {
  sbiCode: string;
  soortActiviteit: 'Hoofdactiviteit' | 'Nevenactiviteit';
}

/**
 * Open Data API response (basis bedrijfsgegevens)
 * Note: Only available for BV and NV legal forms
 */
interface KvKOpenDataResponse {
  datumAanvang?: string; // Start date (format: YYYYMMDD)
  actief?: 'J' | 'N'; // J = Active, N = Inactive
  insolventieCode?: KvKInsolventieCode; // FAIL, SSAN, or SURS (only present if applicable)
  rechtsvormCode?: string; // Legal form code (BV, NV)
  postcodeRegio?: number; // First 2 digits of postal code
  activiteiten?: KvKOpenDataActiviteit[];
  lidstaat?: string; // Country code (NL)
}

/**
 * Company status information from Open Data API
 */
export interface KvKCompanyStatus {
  isActive: boolean; // Derived from actief field
  actief?: 'J' | 'N'; // Raw value from API
  insolventieCode?: KvKInsolventieCode;
  insolventieDescription?: string; // Human-readable description
  statusSource: 'open_data_api' | 'basisprofiel_derived' | 'unavailable';
  statusMessage: string;
}

// ============================================================================
// Internal Data Structures
// ============================================================================

/**
 * Normalized address structure for internal use
 */
interface NormalizedAddress {
  type: string;
  isShielded: boolean;
  fullAddress?: string;
  street?: string;
  houseNumber?: string;
  houseLetter?: string;
  houseNumberAddition?: string;
  addressAddition?: string;
  postalCode?: string;
  poBox?: number;
  city?: string;
  region?: string;
  country: string;
  geoData?: {
    bagObjectId?: string;
    bagAddressId?: string;
    latitude?: number;
    longitude?: number;
    rijksdriehoekX?: number;
    rijksdriehoekY?: number;
    rijksdriehoekZ?: number;
  };
}

/**
 * Complete company data structure with all KVK fields
 */
export interface KvKCompanyData {
  // Core identifiers
  kvkNumber: string;
  rsin?: string; // Rechtspersonen en Samenwerkingsverbanden Informatie Nummer
  vestigingsnummer?: string; // Branch number (12 digits)

  // Company names
  companyName: string; // naam - main company name
  statutoryName?: string; // statutaireNaam - when statutes registered
  primaryTradeName?: string; // eersteHandelsnaam
  tradeNames: {
    businessName: string;
    currentTradeNames: string[];
  };

  // Legal form
  rechtsvorm?: string; // Short legal form (BV, NV, etc.)
  legalForm?: string; // uitgebreideRechtsvorm - extended legal form

  // Registration dates
  formalRegistrationDate?: string;
  materialStartDate?: string; // datumAanvang
  materialEndDate?: string; // datumEinde

  // Employee counts
  totalEmployees?: number;
  fulltimeEmployees?: number;
  parttimeEmployees?: number;

  // Indicators
  indNonMailing?: string; // No mail preference
  indHoofdvestiging?: string; // Is main branch
  indCommercieleVestiging?: string; // Is commercial

  // Activities
  sbiActivities?: KvKSbiActiviteit[];

  // Addresses
  addresses: NormalizedAddress[];
  ownerAddresses?: NormalizedAddress[];

  // Websites
  websites?: string[];
  ownerWebsites?: string[];

  // Branch info (from vestigingen endpoint)
  totalBranches?: number;
  commercialBranches?: number;
  nonCommercialBranches?: number;

  // API metadata
  apiVersion?: string;
  apiWarning?: string;

  // Raw response for storage
  rawApiResponse?: KvKApiResponse;

  // Status information (from Open Data API)
  companyStatus?: KvKCompanyStatus;
}

/**
 * Result of company validation
 */
export interface KvKValidationResult {
  isValid: boolean;
  companyData: KvKCompanyData | null;
  flags: string[];
  message: string;
}

// ============================================================================
// KVK Service Class
// ============================================================================

export class KvKService {
  private readonly baseUrl = 'https://api.kvk.nl/api/v1';
  private readonly openDataUrl = 'https://opendata.kvk.nl/api/v1/hvds';
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.KVK_API_KEY || '';
    if (!this.apiKey) {
      console.warn('KVK_API_KEY not configured - validation will be skipped');
    }
  }

  /**
   * Get human-readable description for insolvency code
   */
  private getInsolventieDescription(code: KvKInsolventieCode): string {
    switch (code) {
      case 'FAIL':
        return 'Faillissement';
      case 'SSAN':
        return 'Schuldsanering';
      case 'SURS':
        return 'Surseance van betaling';
      default:
        return 'Onbekende bijzondere rechtstoestand';
    }
  }

  /**
   * Fetch company status from KVK Open Data API
   * Note: Only available for BV and NV legal forms
   * @param kvkNumber - 8-digit KVK number
   * @returns Company status or fallback based on Basisprofiel data
   */
  async fetchCompanyStatus(kvkNumber: string): Promise<KvKCompanyStatus> {
    try {
      const response = await axios.get<KvKOpenDataResponse>(
        `${this.openDataUrl}/basisbedrijfsgegevens/kvknummer/${kvkNumber}`,
        {
          headers: {
            Accept: 'application/json',
          },
          timeout: 10000,
        }
      );

      const data = response.data;
      const isActive = data.actief === 'J';

      return {
        isActive,
        actief: data.actief,
        insolventieCode: data.insolventieCode,
        insolventieDescription: data.insolventieCode
          ? this.getInsolventieDescription(data.insolventieCode)
          : undefined,
        statusSource: 'open_data_api',
        statusMessage: this.buildStatusMessage(isActive, data.insolventieCode),
      };
    } catch (error: any) {
      // Handle specific error cases
      if (error.response?.status === 404) {
        const errorData = error.response.data;
        // IPD0015 = Legal form not supported (not BV/NV)
        if (errorData?.fout?.[0]?.code === 'IPD0015') {
          console.log(`KvK ${kvkNumber}: Open Data API not available for this legal form`);
          return {
            isActive: true, // Assume active if we can't check
            statusSource: 'unavailable',
            statusMessage: 'Status niet beschikbaar via Open Data API (alleen BV/NV ondersteund)',
          };
        }
      }

      if (error.response?.status === 429) {
        console.warn('KvK Open Data API rate limited');
        return {
          isActive: true, // Assume active on rate limit
          statusSource: 'unavailable',
          statusMessage: 'Status tijdelijk niet beschikbaar (rate limit)',
        };
      }

      console.error('KvK Open Data API error:', error.message);
      return {
        isActive: true, // Assume active on error
        statusSource: 'unavailable',
        statusMessage: 'Status niet kunnen ophalen',
      };
    }
  }

  /**
   * Build human-readable status message
   */
  private buildStatusMessage(isActive: boolean, insolventieCode?: KvKInsolventieCode): string {
    if (insolventieCode) {
      const description = this.getInsolventieDescription(insolventieCode);
      return `Inactief - ${description}`;
    }
    return isActive ? 'Actief' : 'Inactief';
  }

  /**
   * Fetch complete company profile from KVK API
   * @param kvkNumber - 8-digit KVK number
   * @param includeGeoData - Include GPS coordinates and BAG data
   * @returns Complete company data or null
   */
  async fetchCompanyProfile(
    kvkNumber: string,
    includeGeoData = false
  ): Promise<KvKCompanyData | null> {
    if (!this.apiKey) {
      console.error('KVK_API_KEY not configured');
      return null;
    }

    try {
      const response = await axios.get<KvKApiResponse>(
        `${this.baseUrl}/basisprofielen/${kvkNumber}`,
        {
          headers: {
            apikey: this.apiKey,
          },
          params: {
            geoData: includeGeoData,
          },
          timeout: 15000,
        }
      );

      const apiData = response.data;

      // Extract API version and warnings from headers
      const apiVersion = response.headers['api-version'] as string | undefined;
      const apiWarning = response.headers['warning'] as string | undefined;

      return this.transformApiResponse(apiData, apiVersion, apiWarning);
    } catch (error: any) {
      console.error('KvK API error:', error.message);
      if (error.response?.status === 404) {
        console.error(`KvK number ${kvkNumber} not found in registry`);
      }
      return null;
    }
  }

  /**
   * Fetch branch list for a company
   * @param kvkNumber - 8-digit KVK number
   */
  async fetchBranchList(kvkNumber: string): Promise<KvKVestigingListResponse | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/basisprofielen/${kvkNumber}/vestigingen`, {
        headers: {
          apikey: this.apiKey,
        },
        timeout: 10000,
      });

      return response.data as KvKVestigingListResponse;
    } catch (error: any) {
      console.error('KvK API error fetching branches:', error.message);
      return null;
    }
  }

  /**
   * Validate a company against KVK registry
   * Flow:
   * 1. Fetch company profile from Basisprofiel API (names, addresses, etc.)
   * 2. Fetch company status from Open Data API (active/inactive, insolvency)
   * 3. Combine results and determine validation flags
   *
   * @param kvkNumber - 8-digit KVK number
   * @param companyName - Expected company name for validation
   */
  async validateCompany(kvkNumber: string, companyName: string): Promise<KvKValidationResult> {
    if (!this.apiKey) {
      return {
        isValid: false,
        companyData: null,
        flags: ['api_key_missing'],
        message: 'KvK API key not configured',
      };
    }

    try {
      // Step 1: Fetch basic company profile from Basisprofiel API
      const companyData = await this.fetchCompanyProfile(kvkNumber, false);

      if (!companyData) {
        return {
          isValid: false,
          companyData: null,
          flags: ['kvk_number_not_found'],
          message: 'KvK number not found in registry',
        };
      }

      const flags: string[] = [];

      // Step 2: Fetch status from Open Data API (actief/insolventie)
      const companyStatus = await this.fetchCompanyStatus(kvkNumber);
      companyData.companyStatus = companyStatus;

      // Check status flags from Open Data API
      if (companyStatus.statusSource === 'open_data_api') {
        // We have authoritative status info
        if (!companyStatus.isActive) {
          flags.push('inactive');
        }
        if (companyStatus.insolventieCode) {
          flags.push(`insolvency_${companyStatus.insolventieCode.toLowerCase()}`);
        }
      } else {
        // Fallback: use materialEndDate from Basisprofiel API
        if (companyData.materialEndDate) {
          flags.push('dissolved');
        }
      }

      // Step 3: Check company name match (fuzzy comparison)
      const normalizedInput = this.normalizeCompanyName(companyName);
      const normalizedCompany = this.normalizeCompanyName(companyData.companyName);
      const normalizedStatutory = companyData.statutoryName
        ? this.normalizeCompanyName(companyData.statutoryName)
        : '';
      const normalizedTrade = this.normalizeCompanyName(companyData.tradeNames.businessName);

      const nameMatch =
        normalizedInput.includes(normalizedCompany) ||
        normalizedCompany.includes(normalizedInput) ||
        (normalizedStatutory &&
          (normalizedInput.includes(normalizedStatutory) ||
            normalizedStatutory.includes(normalizedInput))) ||
        normalizedInput.includes(normalizedTrade) ||
        normalizedTrade.includes(normalizedInput);

      if (!nameMatch) {
        flags.push('company_name_mismatch');
      }

      return {
        isValid: flags.length === 0,
        companyData,
        flags,
        message:
          flags.length === 0
            ? 'Company verified successfully'
            : `Verification flagged: ${flags.join(', ')}`,
      };
    } catch (error: any) {
      console.error('KvK validation error:', error.message);

      return {
        isValid: false,
        companyData: null,
        flags: ['api_error'],
        message: 'Failed to validate company with KvK API',
      };
    }
  }

  /**
   * Transform KVK API response to internal data structure
   */
  private transformApiResponse(
    apiData: KvKApiResponse,
    apiVersion?: string,
    apiWarning?: string
  ): KvKCompanyData {
    const hoofdvestiging = apiData._embedded?.hoofdvestiging;
    const eigenaar = apiData._embedded?.eigenaar;

    // RSIN can come from eigenaar (preferred) or hoofdvestiging
    const rsin = eigenaar?.rsin || hoofdvestiging?.rsin;

    return {
      // Core identifiers
      kvkNumber: apiData.kvkNummer,
      rsin,
      vestigingsnummer: hoofdvestiging?.vestigingsnummer,

      // Company names
      companyName: apiData.naam,
      statutoryName: apiData.statutaireNaam || hoofdvestiging?.statutaireNaam,
      primaryTradeName: hoofdvestiging?.eersteHandelsnaam,
      tradeNames: {
        businessName: apiData.handelsnamen?.[0]?.naam || apiData.naam,
        currentTradeNames: apiData.handelsnamen?.map((h) => h.naam) || [apiData.naam],
      },

      // Legal form
      rechtsvorm: eigenaar?.rechtsvorm,
      legalForm: eigenaar?.uitgebreideRechtsvorm || eigenaar?.rechtsvorm,

      // Registration dates
      formalRegistrationDate: apiData.formeleRegistratiedatum,
      materialStartDate: apiData.materieleRegistratie?.datumAanvang,
      materialEndDate: apiData.materieleRegistratie?.datumEinde,

      // Employee counts
      totalEmployees: apiData.totaalWerkzamePersonen || hoofdvestiging?.totaalWerkzamePersonen,
      fulltimeEmployees: hoofdvestiging?.voltijdWerkzamePersonen,
      parttimeEmployees: hoofdvestiging?.deeltijdWerkzamePersonen,

      // Indicators
      indNonMailing: apiData.indNonMailing || hoofdvestiging?.indNonMailing,
      indHoofdvestiging: hoofdvestiging?.indHoofdvestiging,
      indCommercieleVestiging: hoofdvestiging?.indCommercieleVestiging,

      // Activities
      sbiActivities: apiData.sbiActiviteiten || hoofdvestiging?.sbiActiviteiten,

      // Addresses
      addresses: this.normalizeAddresses(hoofdvestiging?.adressen),
      ownerAddresses: this.normalizeAddresses(eigenaar?.adressen),

      // Websites
      websites: hoofdvestiging?.websites,
      ownerWebsites: eigenaar?.websites,

      // API metadata
      apiVersion,
      apiWarning,

      // Raw response
      rawApiResponse: apiData,
    };
  }

  /**
   * Normalize addresses from KVK format to internal format
   */
  private normalizeAddresses(addresses?: KvKAdres[]): NormalizedAddress[] {
    if (!addresses || addresses.length === 0) {
      return [];
    }

    return addresses.map((addr) => ({
      type: addr.type || 'bezoekadres',
      isShielded: addr.indAfgeschermd === 'Ja',
      fullAddress: addr.volledigAdres,
      street: addr.straatnaam,
      houseNumber: addr.huisnummer?.toString(),
      houseLetter: addr.huisletter,
      houseNumberAddition: addr.huisnummerToevoeging,
      addressAddition: addr.toevoegingAdres,
      postalCode: addr.postcode,
      poBox: addr.postbusnummer,
      city: addr.plaats,
      region: addr.regio,
      country: addr.land || 'Nederland',
      geoData: addr.geoData
        ? {
            bagObjectId: addr.geoData.addresseerbaarObjectId,
            bagAddressId: addr.geoData.nummerAanduidingId,
            latitude: addr.geoData.gpsLatitude,
            longitude: addr.geoData.gpsLongitude,
            rijksdriehoekX: addr.geoData.rijksdriehoekX,
            rijksdriehoekY: addr.geoData.rijksdriehoekY,
            rijksdriehoekZ: addr.geoData.rijksdriehoekZ,
          }
        : undefined,
    }));
  }

  /**
   * Normalize company name for comparison
   */
  private normalizeCompanyName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, ''); // Remove special characters
  }
}

// Export types for use in other modules
export type {
  KvKApiResponse,
  KvKVestiging,
  KvKEigenaar,
  KvKAdres,
  KvKGeoData,
  KvKHandelsnaam,
  KvKSbiActiviteit,
  KvKMaterieleRegistratie,
  KvKVestigingListResponse,
  NormalizedAddress,
  KvKOpenDataResponse,
};
