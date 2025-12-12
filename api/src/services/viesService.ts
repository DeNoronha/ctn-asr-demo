import axios from 'axios';

// ============================================================================
// VIES API Response Types (based on EC VIES REST API)
// ============================================================================

/**
 * VIES approximate matching data for cross-validation
 */
interface ViesApproximate {
  name: string;
  street: string;
  postalCode: string;
  city: string;
  companyType: string;
  matchName: number; // 1=match, 2=no match, 3=not processed
  matchStreet: number;
  matchPostalCode: number;
  matchCity: number;
  matchCompanyType: number;
}

/**
 * VIES API response structure
 * From: https://ec.europa.eu/taxation_customs/vies/rest-api/ms/{countryCode}/vat/{vatNumber}
 */
export interface ViesApiResponse {
  isValid: boolean;
  requestDate: string; // ISO date string
  userError: string; // VALID, INVALID, MS_UNAVAILABLE, etc.
  name: string; // Company name
  address: string; // Full address (may contain newlines)
  requestIdentifier: string; // Consultation number for audit
  originalVatNumber: string;
  vatNumber: string;
  viesApproximate?: ViesApproximate;
}

/**
 * Normalized VIES data for internal use
 */
export interface ViesCompanyData {
  // VAT identification
  countryCode: string;
  vatNumber: string;
  fullVatNumber: string;

  // Validation result
  isValid: boolean;
  userError: string;
  requestDate: string;
  requestIdentifier: string;

  // Company information
  traderName: string;
  traderAddress: string;

  // Parsed address components (best effort)
  parsedAddress?: {
    street?: string;
    houseNumber?: string;
    postalCode?: string;
    city?: string;
  };

  // Approximate matching data
  approximate?: {
    name: string;
    street: string;
    postalCode: string;
    city: string;
    companyType: string;
    matchName: number;
    matchStreet: number;
    matchPostalCode: number;
    matchCity: number;
    matchCompanyType: number;
  };

  // Raw response for storage
  rawApiResponse: ViesApiResponse;
}

/**
 * Result of VIES validation
 */
export interface ViesValidationResult {
  isValid: boolean;
  companyData: ViesCompanyData | null;
  flags: string[];
  message: string;
}

// ============================================================================
// VIES Service Class
// ============================================================================

export class ViesService {
  private readonly baseUrl = 'https://ec.europa.eu/taxation_customs/vies/rest-api';

  constructor() {
    // No API key needed - VIES is a public service
  }

  /**
   * Validate a VAT number through the EU VIES system
   * @param countryCode - 2-letter EU country code (NL, DE, BE, etc.)
   * @param vatNumber - VAT number without country prefix (e.g., 001671248B03)
   * @returns Complete VIES validation data or null
   */
  async validateVatNumber(
    countryCode: string,
    vatNumber: string
  ): Promise<ViesCompanyData | null> {
    try {
      const response = await axios.get<ViesApiResponse>(
        `${this.baseUrl}/ms/${countryCode.toUpperCase()}/vat/${vatNumber}`,
        {
          headers: {
            Accept: 'application/json',
          },
          timeout: 15000, // 15 second timeout
        }
      );

      const apiData = response.data;
      return this.transformApiResponse(countryCode, vatNumber, apiData);
    } catch (error: any) {
      console.error('VIES API error:', error.message);
      if (error.response?.status === 400) {
        console.error('Invalid VAT number format or country code');
      } else if (error.response?.status >= 500) {
        console.error('VIES service unavailable - member state service may be down');
      }
      return null;
    }
  }

  /**
   * Fetch complete company profile from VIES and validate
   * @param countryCode - 2-letter EU country code
   * @param vatNumber - VAT number without country prefix
   * @returns Validation result with company data
   */
  async fetchAndValidate(
    countryCode: string,
    vatNumber: string
  ): Promise<ViesValidationResult> {
    try {
      const companyData = await this.validateVatNumber(countryCode, vatNumber);

      if (!companyData) {
        return {
          isValid: false,
          companyData: null,
          flags: ['vies_lookup_failed'],
          message: 'Failed to validate VAT number with VIES',
        };
      }

      const flags: string[] = [];

      if (!companyData.isValid) {
        flags.push('vat_invalid');
      }

      if (companyData.userError !== 'VALID') {
        flags.push(`vies_error_${companyData.userError.toLowerCase()}`);
      }

      // Check for missing company name
      if (!companyData.traderName || companyData.traderName === '---') {
        flags.push('missing_trader_name');
      }

      // Check for missing address
      if (!companyData.traderAddress || companyData.traderAddress.trim() === '') {
        flags.push('missing_trader_address');
      }

      return {
        isValid: companyData.isValid && flags.length === 0,
        companyData,
        flags,
        message:
          companyData.isValid
            ? 'VAT number validated successfully'
            : `VAT validation failed: ${companyData.userError}`,
      };
    } catch (error: any) {
      console.error('VIES validation error:', error.message);
      return {
        isValid: false,
        companyData: null,
        flags: ['api_error'],
        message: 'Failed to validate VAT number with VIES API',
      };
    }
  }

  /**
   * Transform VIES API response to internal data structure
   */
  private transformApiResponse(
    countryCode: string,
    vatNumber: string,
    apiData: ViesApiResponse
  ): ViesCompanyData {
    const upperCountryCode = countryCode.toUpperCase();
    const fullVatNumber = `${upperCountryCode}${vatNumber}`;

    // Try to parse the address
    const parsedAddress = this.parseAddress(apiData.address);

    return {
      // VAT identification
      countryCode: upperCountryCode,
      vatNumber,
      fullVatNumber,

      // Validation result
      isValid: apiData.isValid,
      userError: apiData.userError,
      requestDate: apiData.requestDate,
      requestIdentifier: apiData.requestIdentifier || '',

      // Company information
      traderName: apiData.name || '',
      traderAddress: apiData.address || '',

      // Parsed address
      parsedAddress,

      // Approximate matching data
      approximate: apiData.viesApproximate
        ? {
            name: apiData.viesApproximate.name,
            street: apiData.viesApproximate.street,
            postalCode: apiData.viesApproximate.postalCode,
            city: apiData.viesApproximate.city,
            companyType: apiData.viesApproximate.companyType,
            matchName: apiData.viesApproximate.matchName,
            matchStreet: apiData.viesApproximate.matchStreet,
            matchPostalCode: apiData.viesApproximate.matchPostalCode,
            matchCity: apiData.viesApproximate.matchCity,
            matchCompanyType: apiData.viesApproximate.matchCompanyType,
          }
        : undefined,

      // Raw response
      rawApiResponse: apiData,
    };
  }

  /**
   * Parse VIES address string into components
   * VIES returns addresses in various formats, often with newlines
   * Example: "\nACHTSEWEG NOORD 00020\n5651GG EINDHOVEN\n"
   */
  private parseAddress(address: string): {
    street?: string;
    houseNumber?: string;
    postalCode?: string;
    city?: string;
  } | undefined {
    if (!address || address.trim() === '') {
      return undefined;
    }

    const lines = address
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      return undefined;
    }

    const parsed: {
      street?: string;
      houseNumber?: string;
      postalCode?: string;
      city?: string;
    } = {};

    // Try to extract postal code and city from last line
    // Common formats: "5651GG EINDHOVEN", "1234 AB AMSTERDAM"
    const lastLine = lines[lines.length - 1];
    const postalCityMatch = lastLine.match(/^(\d{4}\s?[A-Z]{2})\s+(.+)$/i);
    if (postalCityMatch) {
      parsed.postalCode = postalCityMatch[1].replace(/\s/g, '');
      parsed.city = postalCityMatch[2];
    } else {
      // Try alternative format
      parsed.city = lastLine;
    }

    // First line is typically street + house number
    if (lines.length >= 1 && lines[0] !== lastLine) {
      const streetLine = lines[0];
      // Try to extract house number from end of street
      const streetMatch = streetLine.match(/^(.+?)\s+(\d+[A-Z]?)$/i);
      if (streetMatch) {
        parsed.street = streetMatch[1];
        parsed.houseNumber = streetMatch[2];
      } else {
        parsed.street = streetLine;
      }
    }

    return Object.keys(parsed).length > 0 ? parsed : undefined;
  }

  /**
   * Check if a country code is valid for VIES
   * VIES only works for EU member states
   */
  isEuCountry(countryCode: string): boolean {
    const euCountries = [
      'AT', // Austria
      'BE', // Belgium
      'BG', // Bulgaria
      'CY', // Cyprus
      'CZ', // Czech Republic
      'DE', // Germany
      'DK', // Denmark
      'EE', // Estonia
      'EL', // Greece (uses EL not GR)
      'ES', // Spain
      'FI', // Finland
      'FR', // France
      'HR', // Croatia
      'HU', // Hungary
      'IE', // Ireland
      'IT', // Italy
      'LT', // Lithuania
      'LU', // Luxembourg
      'LV', // Latvia
      'MT', // Malta
      'NL', // Netherlands
      'PL', // Poland
      'PT', // Portugal
      'RO', // Romania
      'SE', // Sweden
      'SI', // Slovenia
      'SK', // Slovakia
      'XI', // Northern Ireland (post-Brexit)
    ];
    return euCountries.includes(countryCode.toUpperCase());
  }
}

// Export types
export type { ViesApproximate };
