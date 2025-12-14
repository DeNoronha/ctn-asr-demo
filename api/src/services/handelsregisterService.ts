import axios from 'axios';

// ============================================================================
// German Handelsregister Service
// Fetches company data from the German Commercial Register
// ============================================================================

/**
 * Address structure from Handelsregister
 */
interface HandelsregisterAddress {
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  country: string;
  fullAddress?: string;
}

/**
 * Representative (Geschäftsführer, Vorstand, etc.)
 */
interface HandelsregisterRepresentative {
  name: string;
  role: string; // Geschäftsführer, Vorstand, Prokurist, etc.
  birthDate?: string;
  residence?: string;
  appointedDate?: string;
}

/**
 * Complete company data from Handelsregister
 */
export interface HandelsregisterCompanyData {
  // Core identifiers
  registerNumber: string;        // e.g., "HRB 116737"
  registerType: 'HRA' | 'HRB' | 'GnR' | 'PR' | 'VR';
  registerCourt: string;         // e.g., "Hamburg"
  registerCourtCode?: string;    // e.g., "K1101R"
  euid?: string;                 // Generated EUID: DEK1101R.HRB116737

  // Company information
  companyName: string;
  legalForm?: string;            // GmbH, AG, KG, etc.
  legalFormLong?: string;        // Full description

  // Status
  status: 'Active' | 'Dissolved' | 'In Liquidation' | 'Unknown';
  registrationDate?: string;
  dissolutionDate?: string;

  // Address
  address?: HandelsregisterAddress;

  // Business details
  businessPurpose?: string;
  shareCapital?: string;
  shareCapitalCurrency?: string;

  // People
  representatives?: HandelsregisterRepresentative[];

  // Source tracking
  dataSource: 'handelsregister' | 'opencorporates' | 'gleif' | 'manual';
  sourceUrl?: string;

  // Raw response for storage
  rawResponse?: any;
}

/**
 * Search result from Handelsregister
 */
export interface HandelsregisterSearchResult {
  status: 'found' | 'not_found' | 'multiple_matches' | 'error';
  companyData?: HandelsregisterCompanyData;
  matches?: HandelsregisterCompanyData[];
  message: string;
}

// German court codes mapping (subset - full list in database)
const COURT_CODES: Record<string, string> = {
  'Hamburg': 'K1101R',
  'Berlin (Charlottenburg)': 'D2201R',
  'Charlottenburg (Berlin)': 'D2201R',
  'Berlin': 'D2201R',
  'München': 'R3101R',
  'Munich': 'R3101R',
  'Frankfurt am Main': 'C3101R',
  'Frankfurt': 'C3101R',
  'Düsseldorf': 'D4101R',
  'Köln': 'D4401R',
  'Cologne': 'D4401R',
  'Stuttgart': 'S2101R',
  'Mannheim': 'S2501R',
  'Nürnberg': 'R2201R',
  'Nuremberg': 'R2201R',
  'Dresden': 'F1103R',
  'Leipzig': 'F1201R',
  'Hannover': 'D2901R',
  'Bremen': 'D1202R',
  'Essen': 'D4201R',
  'Dortmund': 'D4301R',
  'Duisburg': 'D4101R',
  'Bonn': 'D4501R',
  'Wiesbaden': 'C3201R',
  'Mainz': 'B3103R',
  'Saarbrücken': 'B4101R',
  'Kiel': 'D1101R',
  'Lübeck': 'D1301R',
  'Neuss': 'D4601R',
  'Rostock': 'E1103R',
  'Schwerin': 'E1201R',
  'Magdeburg': 'F1301R',
  'Erfurt': 'F2103R',
  'Potsdam': 'E2201R',
};

/**
 * Service for fetching German company data from Handelsregister
 */
export class HandelsregisterService {
  private readonly gleifApiUrl = 'https://api.gleif.org/api/v1';
  private readonly openCorporatesApiUrl = 'https://api.opencorporates.com/v0.4';

  /**
   * Search for a German company by name
   * Uses GLEIF API first (free, reliable) then falls back to other sources
   */
  async searchByCompanyName(
    companyName: string,
    city?: string
  ): Promise<HandelsregisterSearchResult> {
    // Try GLEIF first - they have German company data with registration info
    try {
      const gleifResult = await this.searchGleifByName(companyName, 'DE');
      if (gleifResult.status === 'found' && gleifResult.companyData) {
        return gleifResult;
      }
    } catch (error: any) {
      console.warn('GLEIF search failed:', error.message);
    }

    // Return not found if no results
    return {
      status: 'not_found',
      message: `No German company found for "${companyName}"`,
    };
  }

  /**
   * Search for a German company by HRB/HRA number
   */
  async searchByRegisterNumber(
    registerNumber: string,
    registerCourt?: string
  ): Promise<HandelsregisterSearchResult> {
    // Parse the register number
    const parsed = this.parseRegisterNumber(registerNumber);
    if (!parsed) {
      return {
        status: 'error',
        message: `Invalid register number format: ${registerNumber}`,
      };
    }

    // Try GLEIF with registration authority filter
    try {
      const gleifResult = await this.searchGleifByRegistrationNumber(
        parsed.number,
        parsed.type,
        registerCourt
      );
      if (gleifResult.status === 'found' && gleifResult.companyData) {
        return gleifResult;
      }
    } catch (error: any) {
      console.warn('GLEIF search by register number failed:', error.message);
    }

    // Create basic company data from what we have
    const basicData: HandelsregisterCompanyData = {
      registerNumber: registerNumber,
      registerType: parsed.type as 'HRA' | 'HRB',
      registerCourt: registerCourt || 'Unknown',
      registerCourtCode: registerCourt ? COURT_CODES[registerCourt] : undefined,
      companyName: 'Unknown (manual entry required)',
      status: 'Unknown',
      dataSource: 'manual',
    };

    // Generate EUID if we have court code
    if (basicData.registerCourtCode) {
      basicData.euid = this.generateEuid(
        basicData.registerCourtCode,
        basicData.registerType,
        parsed.number
      );
    }

    return {
      status: 'found',
      companyData: basicData,
      message: 'Basic registration data created - manual verification recommended',
    };
  }

  /**
   * Search GLEIF API for German companies by name
   */
  private async searchGleifByName(
    companyName: string,
    countryCode: string
  ): Promise<HandelsregisterSearchResult> {
    try {
      const response = await axios.get<{ data: any[] }>(`${this.gleifApiUrl}/lei-records`, {
        params: {
          'filter[entity.legalName]': companyName,
          'filter[entity.legalAddress.country]': countryCode,
          'page[size]': 10,
        },
        timeout: 15000,
      });

      const records = response.data?.data || [];

      if (records.length === 0) {
        return {
          status: 'not_found',
          message: `No LEI records found for "${companyName}" in ${countryCode}`,
        };
      }

      if (records.length === 1) {
        return {
          status: 'found',
          companyData: this.transformGleifRecord(records[0]),
          message: 'Company found via GLEIF',
        };
      }

      // Multiple matches - try exact match
      const normalizedSearch = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const exactMatch = records.find((record: any) => {
        const recordName = record.attributes.entity.legalName.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        return recordName === normalizedSearch;
      });

      if (exactMatch) {
        return {
          status: 'found',
          companyData: this.transformGleifRecord(exactMatch),
          message: 'Company found via GLEIF (exact match)',
        };
      }

      return {
        status: 'multiple_matches',
        matches: records.map((r: any) => this.transformGleifRecord(r)),
        message: `Found ${records.length} potential matches for "${companyName}"`,
      };
    } catch (error: any) {
      console.error('GLEIF API error:', error.message);
      throw error;
    }
  }

  /**
   * Search GLEIF API by registration number
   */
  private async searchGleifByRegistrationNumber(
    registerNumber: string,
    registerType: string,
    _registerCourt?: string
  ): Promise<HandelsregisterSearchResult> {
    try {
      // GLEIF stores registration authority info
      const response = await axios.get<{ data: any[] }>(`${this.gleifApiUrl}/lei-records`, {
        params: {
          'filter[entity.registeredAs]': `${registerType} ${registerNumber}`,
          'filter[entity.legalAddress.country]': 'DE',
          'page[size]': 10,
        },
        timeout: 15000,
      });

      const records = response.data?.data || [];

      if (records.length === 0) {
        // Try alternative search
        const altResponse = await axios.get<{ data: any[] }>(`${this.gleifApiUrl}/lei-records`, {
          params: {
            'filter[entity.legalAddress.country]': 'DE',
            'filter[fulltext]': `${registerType} ${registerNumber}`,
            'page[size]': 10,
          },
          timeout: 15000,
        });
        const altRecords = altResponse.data?.data || [];

        if (altRecords.length > 0) {
          return {
            status: 'found',
            companyData: this.transformGleifRecord(altRecords[0]),
            message: 'Company found via GLEIF fulltext search',
          };
        }

        return {
          status: 'not_found',
          message: `No LEI records found for ${registerType} ${registerNumber}`,
        };
      }

      return {
        status: 'found',
        companyData: this.transformGleifRecord(records[0]),
        message: 'Company found via GLEIF',
      };
    } catch (error: any) {
      console.error('GLEIF API error:', error.message);
      throw error;
    }
  }

  /**
   * Transform GLEIF record to HandelsregisterCompanyData
   */
  private transformGleifRecord(record: any): HandelsregisterCompanyData {
    const entity = record.attributes.entity;
    const registration = record.attributes.registration;

    // Extract register info from registeredAs field
    const registeredAs = entity.registeredAs || '';
    const parsed = this.parseRegisterNumber(registeredAs);

    // Extract court from registration authority
    const registrationAuthority = entity.registrationAuthority || {};
    const registerCourt = registrationAuthority.registrationAuthorityEntityID || '';

    // Try to map court to code
    let courtCode: string | undefined;
    for (const [courtName, code] of Object.entries(COURT_CODES)) {
      if (registerCourt.toLowerCase().includes(courtName.toLowerCase())) {
        courtCode = code;
        break;
      }
    }

    // Legal address
    const legalAddress = entity.legalAddress || {};

    const data: HandelsregisterCompanyData = {
      registerNumber: registeredAs || 'Unknown',
      registerType: (parsed?.type as 'HRA' | 'HRB') || 'HRB',
      registerCourt: registerCourt || 'Unknown',
      registerCourtCode: courtCode,
      companyName: entity.legalName?.name || 'Unknown',
      legalForm: entity.legalForm?.id,
      legalFormLong: entity.legalForm?.other,
      status: this.mapGleifStatus(registration?.status),
      registrationDate: registration?.initialRegistrationDate,
      address: {
        street: legalAddress.addressLines?.join(' '),
        postalCode: legalAddress.postalCode,
        city: legalAddress.city,
        country: legalAddress.country || 'DE',
        fullAddress: [
          legalAddress.addressLines?.join(' '),
          `${legalAddress.postalCode || ''} ${legalAddress.city || ''}`.trim(),
          legalAddress.country,
        ]
          .filter(Boolean)
          .join(', '),
      },
      dataSource: 'gleif',
      sourceUrl: `https://search.gleif.org/#/record/${record.attributes.lei}`,
      rawResponse: record,
    };

    // Generate EUID if we have court code
    if (data.registerCourtCode && parsed?.number) {
      data.euid = this.generateEuid(
        data.registerCourtCode,
        data.registerType,
        parsed.number
      );
    }

    return data;
  }

  /**
   * Map GLEIF status to our status
   */
  private mapGleifStatus(
    gleifStatus?: string
  ): 'Active' | 'Dissolved' | 'In Liquidation' | 'Unknown' {
    if (!gleifStatus) return 'Unknown';

    const status = gleifStatus.toUpperCase();
    if (status === 'ISSUED' || status === 'ACTIVE') return 'Active';
    if (status === 'LAPSED' || status === 'RETIRED') return 'Dissolved';
    if (status === 'PENDING_TRANSFER' || status === 'PENDING_ARCHIVAL') return 'In Liquidation';
    return 'Unknown';
  }

  /**
   * Parse register number to extract type and number
   */
  parseRegisterNumber(registerNumber: string): { type: string; number: string } | null {
    if (!registerNumber) return null;

    // Match patterns like "HRB 116737", "HRA 12345", "HRB116737"
    const match = registerNumber.match(/^(HRA|HRB|GnR|PR|VR)\s*(\d+.*)$/i);
    if (match) {
      return {
        type: match[1].toUpperCase(),
        number: match[2].trim(),
      };
    }

    return null;
  }

  /**
   * Generate German EUID from components
   * Format: DE{CourtCode}.{RegisterType}{Number}
   * Example: DEK1101R.HRB116737
   */
  generateEuid(
    courtCode: string,
    registerType: string,
    registerNumber: string
  ): string {
    // Clean the register number (remove spaces)
    const cleanNumber = registerNumber.replace(/\s+/g, '');
    return `DE${courtCode}.${registerType}${cleanNumber}`;
  }

  /**
   * Get court code from court name
   */
  getCourtCode(courtName: string): string | undefined {
    // Direct match
    if (COURT_CODES[courtName]) {
      return COURT_CODES[courtName];
    }

    // Partial match
    for (const [name, code] of Object.entries(COURT_CODES)) {
      if (
        courtName.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(courtName.toLowerCase())
      ) {
        return code;
      }
    }

    return undefined;
  }

  /**
   * Fetch German VAT number via VIES
   * German VAT format: DE + 9 digits
   */
  async fetchVatNumber(companyName: string): Promise<string | null> {
    // VAT lookup would typically require VIES service
    // This is a placeholder - actual implementation would search VIES
    console.log(`VAT lookup for German company "${companyName}" not implemented - use VIES service`);
    return null;
  }
}

// Export singleton instance
export const handelsregisterService = new HandelsregisterService();
