/**
 * Belgian KBO (Kruispuntbank van Ondernemingen) API Service
 *
 * Official paid API for Belgian business register data.
 * API Documentation: https://kruispuntdatabank.be/documentatie/v2/swagger
 * OpenAPI Spec: https://static.kbodata.app/openapi/v2.5.0.json
 *
 * NOTE: This service requires a paid subscription from kbodata.app.
 * Currently DEACTIVATED until subscription is obtained.
 *
 * Plans available:
 * - Search: Basic search functionality
 * - Medium: Includes NSSO/RSZ data
 * - Large: Full access including contacts, financial, roles
 *
 * @see https://kruispuntdatabank.be
 */

import axios from 'axios';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Set this to true when you have a valid API key subscription
 */
const KBO_API_ENABLED = false;

/**
 * API key should be stored in environment variable or Key Vault
 * Format: Get from kbodata.app dashboard after subscription
 */
const KBO_API_KEY = process.env.KBO_API_KEY || '';

// ============================================================================
// Types based on KBO API OpenAPI specification v2.5.0
// ============================================================================

/**
 * Multilingual text object (NL, FR, DE, EN)
 */
interface MultilingualText {
  nl?: string;
  fr?: string;
  de?: string;
  en?: string;
}

/**
 * Juridical form (legal entity type)
 */
interface JuridicalForm {
  code: string;
  description: MultilingualText;
}

/**
 * Juridical situation (status)
 */
interface JuridicalSituation {
  code: string;
  description: MultilingualText;
}

/**
 * Enterprise type
 */
type EnterpriseType = 'natural' | 'entity';

/**
 * Address from KBO
 */
export interface KboApiAddress {
  street?: string;
  houseNumber?: string;
  box?: string;
  zipcode?: string;
  city?: string;
  country?: string;
  countryCode?: string;  // ISO 3166-1 alpha-2
  dateStart?: string;
  dateEnd?: string;
}

/**
 * Activity (NACE code)
 */
export interface KboApiActivity {
  naceCode: string;
  naceVersion: '2008' | '2025';
  description: MultilingualText;
  classCode?: string;
  dateStart?: string;
  dateEnd?: string;
}

/**
 * Denomination (company name)
 */
export interface KboApiDenomination {
  type: 'social' | 'abbreviation' | 'commercial';
  language?: string;
  value: string;
  dateStart?: string;
  dateEnd?: string;
}

/**
 * Contact information (requires Large plan)
 */
export interface KboApiContact {
  typeCode: 'phone' | 'email' | 'website';
  value: string;
}

/**
 * Role/Board member (requires Large plan)
 */
export interface KboApiRole {
  name: string;
  roleTitle: MultilingualText;
  dateStart?: string;
  dateEnd?: string;
}

/**
 * Financial data (requires Large plan)
 */
export interface KboApiFinancial {
  capital?: number;
  currency?: string;
  annualAssemblyMonth?: number;
  fiscalYearStart?: string;
  fiscalYearEnd?: string;
}

/**
 * NSSO/RSZ data (requires Medium plan)
 */
export interface KboApiNsso {
  nssoNumber?: string;
  sectors?: string[];
  employeeInfo?: {
    periodStart?: string;
    periodEnd?: string;
    employeeCount?: number;
  }[];
}

/**
 * Establishment (vestiging)
 */
export interface KboApiEstablishment {
  establishmentNumber: string;
  establishmentNumberFormatted: string;
  active: boolean;
  dateStart?: string;
  dateEnd?: string;
  address?: KboApiAddress;
  activities?: KboApiActivity[];
}

/**
 * Complete Enterprise data from KBO API
 */
export interface KboApiEnterprise {
  enterpriseNumber: string;           // 10 digits without formatting
  enterpriseNumberFormatted: string;  // Formatted: 0439.291.125
  vatNumber?: string;                 // BE0439291125
  active: boolean;
  type: EnterpriseType;
  typeDescription: MultilingualText;
  juridicalForm?: JuridicalForm;
  juridicalSituation?: JuridicalSituation;
  dateStart?: string;
  dateEnd?: string;

  // Optional extended data (fetched separately)
  addresses?: KboApiAddress[];
  activities?: KboApiActivity[];
  denominations?: KboApiDenomination[];
  establishments?: KboApiEstablishment[];
  contacts?: KboApiContact[];           // Large plan
  roles?: KboApiRole[];                 // Large plan
  financial?: KboApiFinancial;          // Large plan
  nsso?: KboApiNsso;                    // Medium plan
}

/**
 * Search result item
 */
export interface KboApiSearchResult {
  enterpriseNumber: string;
  enterpriseNumberFormatted: string;
  denomination: string;
  active: boolean;
  juridicalForm?: JuridicalForm;
  address?: KboApiAddress;
}

/**
 * Paginated response wrapper
 */
export interface KboApiPaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

/**
 * API error response
 */
export interface KboApiError {
  code: string;
  message: string;
  details?: string;
}

// ============================================================================
// KBO API Service
// ============================================================================

export class KboApiService {
  private readonly baseUrl = 'https://api.kbodata.app';
  private client: ReturnType<typeof axios.create>;
  private enabled: boolean;

  constructor(apiKey?: string) {
    this.enabled = KBO_API_ENABLED && !!(apiKey || KBO_API_KEY);

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'apiKey': apiKey || KBO_API_KEY,
      },
    });

    if (!this.enabled) {
      console.warn('[KBO API] Service is DISABLED. Set KBO_API_ENABLED=true and provide API key to enable.');
    }
  }

  /**
   * Check if the service is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get enterprise details by KBO number
   *
   * @param enterpriseNumber - 10-digit KBO number (with or without formatting)
   * @returns Enterprise data or null if not found
   */
  async getEnterprise(enterpriseNumber: string): Promise<KboApiEnterprise | null> {
    if (!this.enabled) {
      console.warn('[KBO API] Cannot fetch enterprise - service disabled');
      return null;
    }

    const cleanNumber = this.cleanEnterpriseNumber(enterpriseNumber);
    console.log(`[KBO API] Fetching enterprise: ${cleanNumber}`);

    try {
      const response = await this.client.get<KboApiEnterprise>(
        `/enterprise/${cleanNumber}`
      );
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'getEnterprise');
      return null;
    }
  }

  /**
   * Get enterprise addresses
   */
  async getEnterpriseAddresses(enterpriseNumber: string): Promise<KboApiAddress[]> {
    if (!this.enabled) return [];

    const cleanNumber = this.cleanEnterpriseNumber(enterpriseNumber);

    try {
      const response = await this.client.get<KboApiAddress[]>(
        `/enterprise/${cleanNumber}/address`
      );
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'getEnterpriseAddresses');
      return [];
    }
  }

  /**
   * Get enterprise activities (NACE codes)
   */
  async getEnterpriseActivities(
    enterpriseNumber: string,
    naceVersion: '2008' | '2025' = '2008'
  ): Promise<KboApiActivity[]> {
    if (!this.enabled) return [];

    const cleanNumber = this.cleanEnterpriseNumber(enterpriseNumber);

    try {
      const response = await this.client.get<KboApiActivity[]>(
        `/enterprise/${cleanNumber}/activities`,
        { params: { 'filter.naceVersion': naceVersion } }
      );
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'getEnterpriseActivities');
      return [];
    }
  }

  /**
   * Get enterprise denominations (names)
   */
  async getEnterpriseDenominations(enterpriseNumber: string): Promise<KboApiDenomination[]> {
    if (!this.enabled) return [];

    const cleanNumber = this.cleanEnterpriseNumber(enterpriseNumber);

    try {
      const response = await this.client.get<KboApiDenomination[]>(
        `/enterprise/${cleanNumber}/denominations`
      );
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'getEnterpriseDenominations');
      return [];
    }
  }

  /**
   * Get enterprise establishments
   */
  async getEnterpriseEstablishments(
    enterpriseNumber: string,
    active: 'active' | 'inactive' | 'all' = 'active'
  ): Promise<KboApiEstablishment[]> {
    if (!this.enabled) return [];

    const cleanNumber = this.cleanEnterpriseNumber(enterpriseNumber);

    try {
      const response = await this.client.get<KboApiEstablishment[]>(
        `/enterprise/${cleanNumber}/establishments`,
        { params: { active } }
      );
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'getEnterpriseEstablishments');
      return [];
    }
  }

  /**
   * Get enterprise contacts (requires Large plan)
   */
  async getEnterpriseContacts(enterpriseNumber: string): Promise<KboApiContact[]> {
    if (!this.enabled) return [];

    const cleanNumber = this.cleanEnterpriseNumber(enterpriseNumber);

    try {
      const response = await this.client.get<KboApiContact[]>(
        `/enterprise/${cleanNumber}/contact`
      );
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'getEnterpriseContacts');
      return [];
    }
  }

  /**
   * Get enterprise roles/board members (requires Large plan)
   */
  async getEnterpriseRoles(enterpriseNumber: string): Promise<KboApiRole[]> {
    if (!this.enabled) return [];

    const cleanNumber = this.cleanEnterpriseNumber(enterpriseNumber);

    try {
      const response = await this.client.get<KboApiRole[]>(
        `/enterprise/${cleanNumber}/roles`
      );
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'getEnterpriseRoles');
      return [];
    }
  }

  /**
   * Get enterprise financial data (requires Large plan)
   */
  async getEnterpriseFinancial(enterpriseNumber: string): Promise<KboApiFinancial | null> {
    if (!this.enabled) return null;

    const cleanNumber = this.cleanEnterpriseNumber(enterpriseNumber);

    try {
      const response = await this.client.get<KboApiFinancial>(
        `/enterprise/${cleanNumber}/financial`
      );
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'getEnterpriseFinancial');
      return null;
    }
  }

  /**
   * Get enterprise NSSO/RSZ data (requires Medium plan)
   */
  async getEnterpriseNsso(enterpriseNumber: string): Promise<KboApiNsso | null> {
    if (!this.enabled) return null;

    const cleanNumber = this.cleanEnterpriseNumber(enterpriseNumber);

    try {
      const response = await this.client.get<KboApiNsso>(
        `/enterprise/${cleanNumber}/nsso`
      );
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'getEnterpriseNsso');
      return null;
    }
  }

  /**
   * Search enterprises by name
   */
  async searchByName(
    query: string,
    options: {
      active?: 'active' | 'inactive' | 'all';
      page?: number;
      limit?: number;
    } = {}
  ): Promise<KboApiPaginatedResponse<KboApiSearchResult>> {
    if (!this.enabled) {
      return { items: [], pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 0 } };
    }

    const { active = 'active', page = 1, limit = 10 } = options;

    try {
      const response = await this.client.get<KboApiPaginatedResponse<KboApiSearchResult>>(
        '/denominations',
        {
          params: {
            query,
            active,
            page,
            limit,
            entityType: 'enterprise',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'searchByName');
      return { items: [], pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 0 } };
    }
  }

  /**
   * Search enterprises by address
   */
  async searchByAddress(
    query: string,
    options: {
      fields?: ('street' | 'zipcode' | 'city')[];
      active?: 'active' | 'inactive' | 'all';
      page?: number;
      limit?: number;
    } = {}
  ): Promise<KboApiPaginatedResponse<KboApiSearchResult>> {
    if (!this.enabled) {
      return { items: [], pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 0 } };
    }

    const { fields, active = 'active', page = 1, limit = 10 } = options;

    try {
      const params: any = { query, active, page, limit };
      if (fields && fields.length > 0) {
        params['fields[]'] = fields;
      }

      const response = await this.client.get<KboApiPaginatedResponse<KboApiSearchResult>>(
        '/addresses',
        { params }
      );
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'searchByAddress');
      return { items: [], pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 0 } };
    }
  }

  /**
   * Validate VAT number via KBO API
   */
  async validateVat(vatNumber: string): Promise<{
    vatNumber: string;
    isValid: boolean;
    enterpriseNumber?: string;
    details?: string;
  } | null> {
    if (!this.enabled) return null;

    // Remove BE prefix if present
    const cleanVat = vatNumber.replace(/^BE/i, '');

    try {
      const response = await this.client.get<{
        vatNumber: string;
        isValid: boolean;
        enterpriseNumber?: string;
        details?: string;
      }>(`/vat/${cleanVat}`);
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'validateVat');
      return null;
    }
  }

  /**
   * Fetch complete enterprise profile with all available data
   * Combines multiple API calls into one comprehensive object
   */
  async fetchCompleteProfile(enterpriseNumber: string): Promise<KboApiEnterprise | null> {
    if (!this.enabled) {
      console.warn('[KBO API] Cannot fetch complete profile - service disabled');
      return null;
    }

    const cleanNumber = this.cleanEnterpriseNumber(enterpriseNumber);
    console.log(`[KBO API] Fetching complete profile for: ${cleanNumber}`);

    try {
      // Fetch base enterprise data
      const enterprise = await this.getEnterprise(cleanNumber);
      if (!enterprise) {
        return null;
      }

      // Fetch additional data in parallel
      const [addresses, activities, denominations, establishments] = await Promise.all([
        this.getEnterpriseAddresses(cleanNumber),
        this.getEnterpriseActivities(cleanNumber),
        this.getEnterpriseDenominations(cleanNumber),
        this.getEnterpriseEstablishments(cleanNumber),
      ]);

      enterprise.addresses = addresses;
      enterprise.activities = activities;
      enterprise.denominations = denominations;
      enterprise.establishments = establishments;

      // Try to fetch premium data (may fail if not on correct plan)
      try {
        const [contacts, roles, financial, nsso] = await Promise.all([
          this.getEnterpriseContacts(cleanNumber),
          this.getEnterpriseRoles(cleanNumber),
          this.getEnterpriseFinancial(cleanNumber),
          this.getEnterpriseNsso(cleanNumber),
        ]);

        if (contacts.length > 0) enterprise.contacts = contacts;
        if (roles.length > 0) enterprise.roles = roles;
        if (financial) enterprise.financial = financial;
        if (nsso) enterprise.nsso = nsso;
      } catch (premiumError) {
        // Premium data not available - that's okay
        console.log('[KBO API] Premium data not available (plan limitation)');
      }

      return enterprise;
    } catch (error: any) {
      this.handleError(error, 'fetchCompleteProfile');
      return null;
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Clean enterprise number to 10 digits
   */
  private cleanEnterpriseNumber(number: string): string {
    return number.replace(/\D/g, '');
  }

  /**
   * Format enterprise number with dots: 0439291125 -> 0439.291.125
   */
  formatEnterpriseNumber(number: string): string {
    const clean = this.cleanEnterpriseNumber(number);
    if (clean.length !== 10) return number;
    return `${clean.slice(0, 4)}.${clean.slice(4, 7)}.${clean.slice(7)}`;
  }

  /**
   * Generate VAT number from enterprise number
   */
  generateVatNumber(enterpriseNumber: string): string {
    const clean = this.cleanEnterpriseNumber(enterpriseNumber);
    return `BE${clean}`;
  }

  /**
   * Validate enterprise number format
   */
  validateEnterpriseNumber(number: string): boolean {
    const clean = this.cleanEnterpriseNumber(number);
    return /^0\d{9}$/.test(clean);
  }

  /**
   * Handle API errors
   */
  private handleError(error: any, operation: string): void {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 402:
          console.error(`[KBO API] ${operation}: Subscription plan insufficient`);
          break;
        case 404:
          console.log(`[KBO API] ${operation}: Not found`);
          break;
        case 422:
          console.error(`[KBO API] ${operation}: Invalid parameters - ${data?.message || ''}`);
          break;
        case 429:
          console.error(`[KBO API] ${operation}: Rate limit exceeded`);
          break;
        default:
          console.error(`[KBO API] ${operation}: HTTP ${status} - ${data?.message || error.message}`);
      }
    } else if (error.request) {
      console.error(`[KBO API] ${operation}: Network error - ${error.message}`);
    } else {
      console.error(`[KBO API] ${operation}: ${error.message}`);
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Default KBO API service instance
 * NOTE: Service is DISABLED until KBO_API_ENABLED is set to true
 */
export const kboApiService = new KboApiService();
