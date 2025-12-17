/**
 * Belgian KBO (Kruispuntbank van Ondernemingen) Service
 *
 * Fetches company data from the Belgian business register public search.
 * Similar approach to German Handelsregister scraping.
 *
 * KBO Public Search URL:
 * https://kbopub.economie.fgov.be/kbopub/zoeknummerform.html?nummer={kboNumber}&actionLu=Zoek
 *
 * @see https://kbopub.economie.fgov.be
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Address structure from KBO
 */
interface KboAddress {
  street?: string;
  houseNumber?: string;
  busNumber?: string;
  postalCode?: string;
  city?: string;
  country: string;
  fullAddress?: string;
}

/**
 * Representative (Bestuurder, Zaakvoerder, etc.)
 */
interface KboRepresentative {
  name: string;
  role: string;
  startDate?: string;
}

/**
 * NACE activity code
 */
interface KboNaceCode {
  code: string;
  description: string;
  isMain: boolean;
}

/**
 * Complete company data from KBO
 */
export interface KboCompanyData {
  // Core identifier
  kboNumber: string;           // Formatted: 0439.291.125
  kboNumberClean: string;      // Clean: 0439291125

  // Enterprise type
  enterpriseType?: string;     // "Rechtspersoon", "Natuurlijk persoon"
  enterpriseTypeCode?: string; // "2" = Rechtspersoon

  // Company information
  companyName: string;
  legalForm?: string;          // BV, NV, BVBA
  legalFormFull?: string;      // Besloten vennootschap

  // Status
  status: 'Actief' | 'Stopgezet' | 'Start' | 'Unknown';
  statusStartDate?: string;
  startDate?: string;
  endDate?: string;

  // Address
  address?: KboAddress;

  // VAT information
  vatNumber?: string;          // BE0439291125
  vatStatus?: string;          // "BTW-plichtig sinds..."
  vatStartDate?: string;

  // Activities
  naceCodes?: KboNaceCode[];
  mainActivity?: string;

  // People
  representatives?: KboRepresentative[];

  // Establishments
  establishmentCount?: number;

  // Source tracking
  dataSource: 'kbo_public' | 'kbo_api';
  sourceUrl: string;

  // Raw response for storage
  rawResponse?: any;
}

/**
 * Search result from KBO
 */
export interface KboSearchResult {
  status: 'found' | 'not_found' | 'error';
  companyData?: KboCompanyData;
  message: string;
}

/**
 * Service for fetching Belgian company data from KBO
 */
export class KboService {
  private readonly baseUrl = 'https://kbopub.economie.fgov.be/kbopub';

  /**
   * Search KBO by enterprise number
   * @param kboNumber - KBO number (10 digits, with or without formatting)
   */
  async searchByKboNumber(kboNumber: string): Promise<KboSearchResult> {
    const cleanNumber = this.cleanKboNumber(kboNumber);

    if (!this.validateKboNumber(cleanNumber)) {
      return {
        status: 'error',
        message: `Invalid KBO number format: ${kboNumber}. Must be 10 digits starting with 0.`,
      };
    }

    console.log(`[KBO] Searching for enterprise number: ${cleanNumber}`);

    try {
      const url = `${this.baseUrl}/zoeknummerform.html?nummer=${cleanNumber}&actionLu=Zoek`;

      const response = await axios.get<string>(url, {
        timeout: 15000,
        responseType: 'text',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ASR-Enrichment/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'nl,en;q=0.9',
        },
      });

      if (response.status !== 200) {
        return {
          status: 'error',
          message: `KBO returned status ${response.status}`,
        };
      }

      const companyData = this.parseKboHtml(response.data, cleanNumber, url);

      if (!companyData) {
        return {
          status: 'not_found',
          message: `No company found for KBO number: ${this.formatKboNumber(cleanNumber)}`,
        };
      }

      return {
        status: 'found',
        companyData,
        message: `Company found: ${companyData.companyName}`,
      };
    } catch (error: any) {
      console.error('[KBO] Search failed:', error.message);
      return {
        status: 'error',
        message: `KBO search failed: ${error.message}`,
      };
    }
  }

  /**
   * Parse KBO HTML response to extract company data
   */
  private parseKboHtml(html: string, kboNumber: string, sourceUrl: string): KboCompanyData | null {
    const $ = cheerio.load(html);

    // Check if we got a result page or "not found"
    const pageTitle = $('title').text();
    if (pageTitle.includes('Geen resultaat') || pageTitle.includes('Aucun résultat')) {
      return null;
    }

    // Look for the company name - KBO page structure uses td with class QL/RL
    let companyName = '';

    // Primary extraction: Find the "Naam:" row in the KBO table structure
    // Format: <td class="QL">Naam:</td><td class="QL" colspan="3">Company Name<br/>...</td>
    $('table tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        const label = $(cells[0]).text().trim().toLowerCase();
        // Look specifically for "Naam:" label (not general "naam" which might match elsewhere)
        if (label === 'naam:') {
          // Get the text content, but only the first line (before any <br/> or <span>)
          const fullText = $(cells[1]).html() || '';
          // Extract text before first <br/> or <span>
          const nameMatch = fullText.match(/^([^<]+)/);
          if (nameMatch) {
            companyName = nameMatch[1].trim();
          }
          if (!companyName) {
            // Fallback: just get the text content
            companyName = $(cells[1]).contents().first().text().trim();
          }
          if (companyName) {
            return false; // break
          }
        }
      }
    });

    // Fallback: Try denomination patterns
    if (!companyName) {
      const denominationSection = $('td:contains("Maatschappelijke naam"), td:contains("Dénomination")').next('td');
      if (denominationSection.length > 0) {
        companyName = denominationSection.text().split('\n')[0].trim();
      }
    }

    // Last resort: Look for text that matches company name pattern in the content
    if (!companyName) {
      const contentText = $('body').text();
      // Extract name from patterns like "Naam: Company Name"
      const nameMatch = contentText.match(/Naam:\s*([^\n]+)/i);
      if (nameMatch) {
        companyName = nameMatch[1].trim();
      }
    }

    if (!companyName) {
      console.warn('[KBO] Could not extract company name from HTML');
      return null;
    }

    // Initialize company data
    const data: KboCompanyData = {
      kboNumber: this.formatKboNumber(kboNumber),
      kboNumberClean: kboNumber,
      companyName,
      status: 'Unknown',
      dataSource: 'kbo_public',
      sourceUrl,
      rawResponse: { html: html.substring(0, 50000) }, // Limit stored HTML
    };

    // Extract legal form
    this.extractField($, ['Rechtsvorm', 'Forme juridique', 'Legal form'], (value) => {
      data.legalFormFull = value;
      // Extract short form (e.g., "Besloten vennootschap" -> "BV")
      if (value.toLowerCase().includes('besloten vennootschap')) {
        data.legalForm = 'BV';
      } else if (value.toLowerCase().includes('naamloze vennootschap')) {
        data.legalForm = 'NV';
      } else if (value.toLowerCase().includes('coöperatieve')) {
        data.legalForm = 'CVBA';
      } else if (value.toLowerCase().includes('commanditaire')) {
        data.legalForm = 'CommV';
      } else if (value.toLowerCase().includes('vereniging zonder winstoogmerk') || value.toLowerCase().includes('vzw')) {
        data.legalForm = 'VZW';
      }
    });

    // Extract status
    this.extractField($, ['Status', 'Situatie', 'Toestand'], (value) => {
      const lowerValue = value.toLowerCase();
      if (lowerValue.includes('actief') || lowerValue.includes('actif')) {
        data.status = 'Actief';
      } else if (lowerValue.includes('stopgezet') || lowerValue.includes('cessé')) {
        data.status = 'Stopgezet';
      } else if (lowerValue.includes('start') || lowerValue.includes('début')) {
        data.status = 'Start';
      }
    });

    // Extract start date
    this.extractField($, ['Startdatum', 'Date de début', 'Start date', 'Oprichtingsdatum'], (value) => {
      data.startDate = value;
    });

    // Extract enterprise type
    this.extractField($, ['Type onderneming', 'Type d\'entreprise', 'Enterprise type'], (value) => {
      data.enterpriseType = value;
      if (value.toLowerCase().includes('rechtspersoon') || value.toLowerCase().includes('personne morale')) {
        data.enterpriseTypeCode = '2';
      } else if (value.toLowerCase().includes('natuurlijk') || value.toLowerCase().includes('physique')) {
        data.enterpriseTypeCode = '1';
      }
    });

    // Extract address
    const address: KboAddress = { country: 'Belgium' };
    this.extractField($, ['Adres', 'Adresse', 'Address', 'Maatschappelijke zetel', 'Siège social'], (value) => {
      address.fullAddress = value;
      // Try to parse Belgian address format: "Street Number, PostalCode City"
      const addressMatch = value.match(/^(.+?)\s+(\d+(?:\s*bus\s*\d+)?)\s*,?\s*(\d{4})\s+(.+)$/i);
      if (addressMatch) {
        address.street = addressMatch[1].trim();
        const houseAndBus = addressMatch[2];
        const busMatch = houseAndBus.match(/(\d+)\s*bus\s*(\d+)/i);
        if (busMatch) {
          address.houseNumber = busMatch[1];
          address.busNumber = busMatch[2];
        } else {
          address.houseNumber = houseAndBus.trim();
        }
        address.postalCode = addressMatch[3];
        address.city = addressMatch[4].trim();
      }
    });

    if (address.fullAddress || address.street) {
      data.address = address;
    }

    // Extract VAT information
    // Belgian VAT = BE + KBO number (without dots)
    data.vatNumber = `BE${kboNumber}`;

    this.extractField($, ['BTW', 'TVA', 'VAT', 'BTW-plichtig'], (value) => {
      data.vatStatus = value;
      // Extract date if present
      const dateMatch = value.match(/sinds\s+(\d{1,2}\s+\w+\s+\d{4})|depuis\s+le\s+(\d{1,2}\s+\w+\s+\d{4})/i);
      if (dateMatch) {
        data.vatStartDate = dateMatch[1] || dateMatch[2];
      }
    });

    // Extract NACE codes
    const naceCodes: KboNaceCode[] = [];
    $('table tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        const text = $(cells[0]).text().trim();
        // Look for NACE code patterns (XX.XXX format)
        const naceMatch = text.match(/(\d{2}\.\d{3})/);
        if (naceMatch) {
          const description = $(cells[1]).text().trim() || text.replace(naceMatch[0], '').trim();
          naceCodes.push({
            code: naceMatch[1],
            description,
            isMain: naceCodes.length === 0, // First one is main activity
          });
        }
      }
    });

    // Alternative NACE extraction from text
    if (naceCodes.length === 0) {
      const pageText = $('body').text();
      const naceMatches = pageText.match(/(\d{2}\.\d{3})\s*[-–]\s*([^\n]+)/g);
      if (naceMatches) {
        naceMatches.forEach((match, idx) => {
          const parts = match.match(/(\d{2}\.\d{3})\s*[-–]\s*(.+)/);
          if (parts) {
            naceCodes.push({
              code: parts[1],
              description: parts[2].trim(),
              isMain: idx === 0,
            });
          }
        });
      }
    }

    if (naceCodes.length > 0) {
      data.naceCodes = naceCodes;
      data.mainActivity = naceCodes.find(n => n.isMain)?.description || naceCodes[0]?.description;
    }

    // Extract representatives/management
    const representatives: KboRepresentative[] = [];
    const managementLabels = ['Bestuurder', 'Zaakvoerder', 'Directeur', 'Administrateur', 'Gérant'];

    $('table tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        const label = $(cells[0]).text().trim();
        const value = $(cells[1]).text().trim();

        for (const mLabel of managementLabels) {
          if (label.toLowerCase().includes(mLabel.toLowerCase())) {
            // Value might contain name and date
            const rep: KboRepresentative = {
              name: value.split(',')[0].trim(),
              role: mLabel,
            };
            // Try to extract date
            const dateMatch = value.match(/sinds\s+(\d{1,2}[-/]\d{1,2}[-/]\d{4})|depuis\s+(\d{1,2}[-/]\d{1,2}[-/]\d{4})/i);
            if (dateMatch) {
              rep.startDate = dateMatch[1] || dateMatch[2];
            }
            representatives.push(rep);
            break;
          }
        }
      }
    });

    if (representatives.length > 0) {
      data.representatives = representatives;
    }

    // Count establishments if mentioned
    const estMatch = $('body').text().match(/(\d+)\s*(?:vestiging|établissement|establishment)/i);
    if (estMatch) {
      data.establishmentCount = parseInt(estMatch[1], 10);
    }

    return data;
  }

  /**
   * Helper to extract field value from table rows
   */
  private extractField(
    $: ReturnType<typeof cheerio.load>,
    labels: string[],
    callback: (value: string) => void
  ): void {
    for (const label of labels) {
      // Try table-based extraction
      $('table tr').each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 2) {
          const cellLabel = $(cells[0]).text().trim().toLowerCase();
          if (cellLabel.includes(label.toLowerCase())) {
            const value = $(cells[1]).text().trim();
            if (value) {
              callback(value);
              return false; // break
            }
          }
        }
      });

      // Try definition list extraction
      $('dt, th').each((_, el) => {
        const dtText = $(el).text().trim().toLowerCase();
        if (dtText.includes(label.toLowerCase())) {
          const dd = $(el).next('dd, td').text().trim();
          if (dd) {
            callback(dd);
            return false;
          }
        }
      });
    }
  }

  /**
   * Clean KBO number to 10 digits
   */
  cleanKboNumber(kboNumber: string): string {
    return kboNumber.replace(/\D/g, '');
  }

  /**
   * Format KBO number with dots: 0439291125 -> 0439.291.125
   */
  formatKboNumber(kboNumber: string): string {
    const clean = this.cleanKboNumber(kboNumber);
    if (clean.length !== 10) return kboNumber;
    return `${clean.slice(0, 4)}.${clean.slice(4, 7)}.${clean.slice(7)}`;
  }

  /**
   * Validate KBO number format
   * Belgian KBO numbers are 10 digits starting with 0
   */
  validateKboNumber(kboNumber: string): boolean {
    const clean = this.cleanKboNumber(kboNumber);
    return /^0\d{9}$/.test(clean);
  }

  /**
   * Generate Belgian VAT number from KBO
   * Belgian VAT format: BE + 10-digit KBO number (no dots)
   */
  generateVatNumber(kboNumber: string): string {
    const clean = this.cleanKboNumber(kboNumber);
    return `BE${clean}`;
  }

  /**
   * Generate EUID for Belgian company
   * Format: BE.KBO.{number}
   */
  generateEuid(kboNumber: string): string {
    const clean = this.cleanKboNumber(kboNumber);
    return `BE.KBO.${clean}`;
  }
}

// Export singleton instance
export const kboService = new KboService();
