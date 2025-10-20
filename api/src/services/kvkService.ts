import axios from 'axios';

interface KvKCompanyData {
  kvkNumber: string;
  tradeNames: {
    businessName: string;
    currentTradeNames: string[];
  };
  statutoryName: string;
  status?: string;
  addresses: Array<{
    type: string;
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    country: string;
  }>;
}

interface KvKValidationResult {
  isValid: boolean;
  companyData: KvKCompanyData | null;
  flags: string[];
  message: string;
}

export class KvKService {
  private readonly baseUrl = 'https://api.kvk.nl/api/v1';
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.KVK_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️  KVK_API_KEY not configured - validation will be skipped');
    }
  }

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
      const response = await axios.get(`${this.baseUrl}/basisprofielen/${kvkNumber}`, {
        headers: {
          'apikey': this.apiKey,
        },
        timeout: 10000,
      });

      const data = response.data as KvKCompanyData;
      const flags: string[] = [];

      // Check for bankruptcies or dissolution
      if (data.status === 'Faillissement') {
        flags.push('bankrupt');
      }
      if (data.status === 'Ontbonden') {
        flags.push('dissolved');
      }

      // Check company name match (fuzzy comparison)
      const normalizedExtracted = this.normalizeCompanyName(companyName);
      const normalizedStatutory = this.normalizeCompanyName(data.statutoryName);
      const normalizedTrade = this.normalizeCompanyName(data.tradeNames.businessName);

      const nameMatch = 
        normalizedExtracted.includes(normalizedStatutory) ||
        normalizedStatutory.includes(normalizedExtracted) ||
        normalizedExtracted.includes(normalizedTrade) ||
        normalizedTrade.includes(normalizedExtracted);

      if (!nameMatch) {
        flags.push('company_name_mismatch');
      }

      return {
        isValid: flags.length === 0,
        companyData: data,
        flags,
        message: flags.length === 0 
          ? 'Company verified successfully'
          : `Verification flagged: ${flags.join(', ')}`,
      };
    } catch (error: any) {
      console.error('KvK API error:', error.message);
      
      if (error.response?.status === 404) {
        return {
          isValid: false,
          companyData: null,
          flags: ['kvk_number_not_found'],
          message: 'KvK number not found in registry',
        };
      }

      return {
        isValid: false,
        companyData: null,
        flags: ['api_error'],
        message: 'Failed to validate company with KvK API',
      };
    }
  }

  private normalizeCompanyName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, ''); // Remove special characters
  }
}
