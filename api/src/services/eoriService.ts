/**
 * EU EORI (Economic Operators Registration and Identification) Validation Service
 *
 * Validates EORI numbers through the official EU SOAP web service.
 * EORI numbers are required for customs clearance in EU import/export operations.
 *
 * SOAP Endpoint: https://ec.europa.eu/taxation_customs/dds2/eos/validation/services/validation
 * WSDL: https://ec.europa.eu/taxation_customs/dds2/eos/validation/services/validation?wsdl
 *
 * Rate Limits:
 * - Max 10 EORI numbers per request
 * - Max 100 requests per second
 *
 * @see https://ec.europa.eu/taxation_customs/dds2/eos/eori_validation.jsp
 */

import axios from 'axios';

// ============================================================================
// EORI Response Types
// ============================================================================

/**
 * Individual EORI validation result from SOAP response
 */
export interface EoriValidationResponse {
  eori: string;
  status: string;          // '0' = valid, '1' = invalid, '2' = error
  statusDescr: string;     // Human-readable status description
  errorReason?: string;    // Error reason if invalid/error
  name?: string;           // Trader name
  address?: string;        // Full address
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;
}

/**
 * Full SOAP response structure
 */
interface EoriSoapResponse {
  requestDate: string;
  errorDescription?: string;
  results: EoriValidationResponse[];
}

/**
 * Normalized EORI data for internal use
 */
export interface EoriCompanyData {
  eoriNumber: string;
  countryCode: string;

  // Validation result
  isValid: boolean;
  status: string;
  statusDescription: string;
  errorReason?: string;
  requestDate: string;

  // Trader information
  traderName?: string;
  traderAddress?: string;

  // Parsed address components
  parsedAddress?: {
    street?: string;
    postalCode?: string;
    city?: string;
    country?: string;
  };

  // Raw response for storage
  rawResponse: EoriValidationResponse;
}

/**
 * Result of EORI validation
 */
export interface EoriValidationResult {
  isValid: boolean;
  companyData: EoriCompanyData | null;
  flags: string[];
  message: string;
}

// ============================================================================
// EORI Service Class
// ============================================================================

export class EoriService {
  private readonly soapEndpoint = 'https://ec.europa.eu/taxation_customs/dds2/eos/validation/services/validation';

  constructor() {
    // No API key needed - EU EORI validation is a public service
  }

  /**
   * Validate a single EORI number through the EU SOAP service
   * @param eoriNumber - Full EORI number with country prefix (e.g., NL123456789)
   * @returns Complete EORI validation data or null
   */
  async validateEori(eoriNumber: string): Promise<EoriCompanyData | null> {
    try {
      const cleanEori = eoriNumber.toUpperCase().replace(/\s/g, '');
      const countryCode = cleanEori.substring(0, 2);

      // Build SOAP request
      const soapRequest = this.buildSoapRequest([cleanEori]);

      const response = await axios.post<string>(this.soapEndpoint, soapRequest, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': '',
        },
        timeout: 15000, // 15 second timeout
        responseType: 'text',
      });

      const parsed = this.parseSoapResponse(response.data);

      if (!parsed || parsed.results.length === 0) {
        console.error('EORI validation returned no results');
        return null;
      }

      const result = parsed.results[0];
      return this.transformToCompanyData(result, countryCode, parsed.requestDate);

    } catch (error: any) {
      console.error('EORI SOAP API error:', error.message);
      if (error.response?.status >= 500) {
        console.error('EORI service unavailable');
      }
      return null;
    }
  }

  /**
   * Validate multiple EORI numbers in a single request (max 10)
   * @param eoriNumbers - Array of EORI numbers
   * @returns Array of validation results
   */
  async validateMultiple(eoriNumbers: string[]): Promise<EoriCompanyData[]> {
    if (eoriNumbers.length === 0) return [];
    if (eoriNumbers.length > 10) {
      throw new Error('Maximum 10 EORI numbers per request');
    }

    try {
      const cleanNumbers = eoriNumbers.map(n => n.toUpperCase().replace(/\s/g, ''));
      const soapRequest = this.buildSoapRequest(cleanNumbers);

      const response = await axios.post<string>(this.soapEndpoint, soapRequest, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': '',
        },
        timeout: 30000, // 30 second timeout for batch
        responseType: 'text',
      });

      const parsed = this.parseSoapResponse(response.data);
      if (!parsed) return [];

      return parsed.results.map(result => {
        const countryCode = result.eori.substring(0, 2);
        return this.transformToCompanyData(result, countryCode, parsed.requestDate);
      });

    } catch (error: any) {
      console.error('EORI batch validation error:', error.message);
      return [];
    }
  }

  /**
   * Fetch and validate EORI with full result
   */
  async fetchAndValidate(eoriNumber: string): Promise<EoriValidationResult> {
    try {
      const companyData = await this.validateEori(eoriNumber);

      if (!companyData) {
        return {
          isValid: false,
          companyData: null,
          flags: ['eori_lookup_failed'],
          message: 'Failed to validate EORI number with EU service',
        };
      }

      const flags: string[] = [];

      if (!companyData.isValid) {
        flags.push('eori_invalid');
      }

      if (companyData.errorReason) {
        flags.push('eori_error');
      }

      // Check for missing trader info
      if (!companyData.traderName) {
        flags.push('missing_trader_name');
      }

      return {
        isValid: companyData.isValid && flags.length === 0,
        companyData,
        flags,
        message: companyData.isValid
          ? 'EORI number validated successfully'
          : `EORI validation failed: ${companyData.statusDescription}`,
      };
    } catch (error: any) {
      console.error('EORI validation error:', error.message);
      return {
        isValid: false,
        companyData: null,
        flags: ['api_error'],
        message: 'Failed to validate EORI number with EU service',
      };
    }
  }

  /**
   * Build SOAP XML request for EORI validation
   */
  private buildSoapRequest(eoriNumbers: string[]): string {
    const eoriElements = eoriNumbers
      .map(eori => `      <ev:eori>${this.escapeXml(eori)}</ev:eori>`)
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ev="http://eori.ws.eos.dds.s/">
  <soap:Body>
    <ev:validateEORI>
${eoriElements}
    </ev:validateEORI>
  </soap:Body>
</soap:Envelope>`;
  }

  /**
   * Parse SOAP XML response
   */
  private parseSoapResponse(xmlData: string): EoriSoapResponse | null {
    try {
      // Extract requestDate
      const requestDateMatch = xmlData.match(/<requestDate>([^<]+)<\/requestDate>/);
      const requestDate = requestDateMatch ? requestDateMatch[1] : new Date().toISOString();

      // Extract error description if any
      const errorDescMatch = xmlData.match(/<errorDescription>([^<]*)<\/errorDescription>/);
      const errorDescription = errorDescMatch ? errorDescMatch[1] : undefined;

      // Extract all result elements
      const results: EoriValidationResponse[] = [];
      const resultRegex = /<result>([\s\S]*?)<\/result>/g;
      let match;

      while ((match = resultRegex.exec(xmlData)) !== null) {
        const resultXml = match[1];
        results.push(this.parseResultElement(resultXml));
      }

      // Also try eoriResponse elements (different response format)
      const responseRegex = /<eoriResponse>([\s\S]*?)<\/eoriResponse>/g;
      while ((match = responseRegex.exec(xmlData)) !== null) {
        const resultXml = match[1];
        results.push(this.parseResultElement(resultXml));
      }

      return { requestDate, errorDescription, results };
    } catch (error: any) {
      console.error('Failed to parse EORI SOAP response:', error.message);
      return null;
    }
  }

  /**
   * Parse individual result element from SOAP response
   */
  private parseResultElement(xml: string): EoriValidationResponse {
    const extractValue = (tag: string): string | undefined => {
      const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
      return match ? match[1] : undefined;
    };

    return {
      eori: extractValue('eori') || '',
      status: extractValue('status') || '2', // Default to error
      statusDescr: extractValue('statusDescr') || 'Unknown status',
      errorReason: extractValue('errorReason'),
      name: extractValue('name'),
      address: extractValue('address'),
      street: extractValue('street'),
      postalCode: extractValue('postalCode'),
      city: extractValue('city'),
      country: extractValue('country'),
    };
  }

  /**
   * Transform SOAP response to internal data structure
   */
  private transformToCompanyData(
    result: EoriValidationResponse,
    countryCode: string,
    requestDate: string
  ): EoriCompanyData {
    const isValid = result.status === '0';

    return {
      eoriNumber: result.eori,
      countryCode,

      // Validation result
      isValid,
      status: result.status,
      statusDescription: result.statusDescr,
      errorReason: result.errorReason,
      requestDate,

      // Trader information
      traderName: result.name,
      traderAddress: result.address,

      // Parsed address
      parsedAddress: (result.street || result.postalCode || result.city || result.country) ? {
        street: result.street,
        postalCode: result.postalCode,
        city: result.city,
        country: result.country,
      } : undefined,

      // Raw response
      rawResponse: result,
    };
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Check if country code is valid for EORI
   * EORI is primarily for EU countries but also works for GB (post-Brexit)
   */
  isValidEoriCountry(countryCode: string): boolean {
    const validCountries = [
      'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'ES',
      'FI', 'FR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT',
      'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
      'GB', 'XI', // UK and Northern Ireland
      'NO', 'CH', 'IS', 'LI', // EFTA countries
    ];
    return validCountries.includes(countryCode.toUpperCase());
  }

  /**
   * Extract country code from EORI number
   */
  extractCountryCode(eoriNumber: string): string {
    return eoriNumber.substring(0, 2).toUpperCase();
  }

  /**
   * Validate EORI format (basic format check)
   */
  isValidFormat(eoriNumber: string): boolean {
    // EORI format: 2 letter country code + 1-15 alphanumeric characters
    const pattern = /^[A-Z]{2}[A-Z0-9]{1,15}$/i;
    return pattern.test(eoriNumber);
  }
}

// Export types
export type { EoriSoapResponse };
