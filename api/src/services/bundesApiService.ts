import axios from 'axios';
import * as cheerio from 'cheerio';

// ============================================================================
// BundesAPI Handelsregister Service
// Scrapes data from the official German Commercial Register portal
// Based on: https://github.com/bundesAPI/handelsregister
// Rate limit: 60 queries/hour per Terms of Use
// ============================================================================

/**
 * Search result from Handelsregister.de
 */
export interface HandelsregisterEntry {
  name: string;
  court: string;           // e.g., "Neuss HRB 15884"
  registerType: string;    // HRA, HRB, GnR, VR, PR
  registerNumber: string;  // e.g., "15884"
  state: string;           // Federal state (Bundesland)
  status: string;          // Current status text
  statusCurrent: boolean;  // Is the entry current/active
}

/**
 * Search options
 */
export interface SearchOptions {
  mode?: 'all' | 'min' | 'exact';  // all=contains all words, min=at least one, exact=exact match
}

/**
 * Service for fetching German company data from Handelsregister.de
 * This uses web scraping similar to the bundesAPI Python implementation
 */
export class BundesApiService {
  private readonly baseUrl = 'https://www.handelsregister.de';
  private cookies: string[] = [];
  private lastRequestTime = 0;
  private readonly minRequestInterval = 60000; // 1 minute between requests (60/hour limit)

  /**
   * Search for companies by keyword
   */
  async search(keyword: string, options: SearchOptions = {}): Promise<HandelsregisterEntry[]> {
    const mode = options.mode || 'all';

    // Rate limiting check
    const now = Date.now();
    if (now - this.lastRequestTime < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - (now - this.lastRequestTime);
      console.log(`Rate limiting: waiting ${waitTime}ms before next request`);
      await this.sleep(waitTime);
    }
    this.lastRequestTime = Date.now();

    try {
      // Step 1: Get initial page and cookies
      console.log('BundesAPI: Initializing session...');
      const initialResponse = await this.makeRequest('GET', '/rp_web/welcome.xhtml');
      this.extractCookies(initialResponse.headers['set-cookie']);

      // Step 2: Navigate to advanced search
      console.log('BundesAPI: Navigating to advanced search...');
      const viewState = this.extractViewState(initialResponse.data);

      const navFormData = new URLSearchParams();
      navFormData.append('naviForm', 'naviForm');
      navFormData.append('naviForm:erweiterteSucheLink', 'naviForm:erweiterteSucheLink');
      navFormData.append('javax.faces.ViewState', viewState);

      const navResponse = await this.makeRequest('POST', '/rp_web/welcome.xhtml', navFormData.toString());
      this.extractCookies(navResponse.headers['set-cookie']);

      // Step 3: Perform search
      console.log(`BundesAPI: Searching for "${keyword}"...`);
      const searchViewState = this.extractViewState(navResponse.data);

      const modeMap: Record<string, string> = { 'all': '1', 'min': '2', 'exact': '3' };

      const searchFormData = new URLSearchParams();
      searchFormData.append('form', 'form');
      searchFormData.append('form:schlagwoerter', keyword);
      searchFormData.append('form:schlagwortOptionen', modeMap[mode]);
      searchFormData.append('form:btnSuche', '');
      searchFormData.append('javax.faces.ViewState', searchViewState);

      const searchResponse = await this.makeRequest('POST', '/rp_web/erpiframe.xhtml', searchFormData.toString());

      // Step 4: Parse results
      const results = this.parseSearchResults(searchResponse.data);
      console.log(`BundesAPI: Found ${results.length} results`);

      return results;
    } catch (error: any) {
      console.error('BundesAPI search failed:', error.message);
      throw error;
    }
  }

  /**
   * Search by HRB/HRA number
   */
  async searchByRegisterNumber(
    registerType: string,
    registerNumber: string,
    court?: string
  ): Promise<HandelsregisterEntry | null> {
    // Search with the register number
    const searchTerm = court
      ? `${registerType} ${registerNumber} ${court}`
      : `${registerType} ${registerNumber}`;

    const results = await this.search(searchTerm, { mode: 'all' });

    // Find exact match
    const normalizedNumber = registerNumber.replace(/\s+/g, '');
    const match = results.find(r => {
      const resultNumber = r.registerNumber.replace(/\s+/g, '');
      return resultNumber === normalizedNumber &&
             r.registerType.toUpperCase() === registerType.toUpperCase();
    });

    return match || null;
  }

  /**
   * Make HTTP request with cookies
   */
  private async makeRequest(
    method: 'GET' | 'POST',
    path: string,
    data?: string
  ): Promise<{ data: string; headers: any }> {
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
    };

    if (this.cookies.length > 0) {
      headers['Cookie'] = this.cookies.join('; ');
    }

    if (method === 'POST') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    const response = await axios.request({
      method,
      url,
      data,
      headers,
      timeout: 30000,
      validateStatus: () => true, // Accept all status codes
    });

    return {
      data: response.data,
      headers: response.headers,
    };
  }

  /**
   * Extract cookies from response headers
   */
  private extractCookies(setCookieHeaders: string[] | undefined): void {
    if (!setCookieHeaders) return;

    for (const header of setCookieHeaders) {
      const cookie = header.split(';')[0];
      const cookieName = cookie.split('=')[0];

      // Replace existing cookie or add new one
      const existingIndex = this.cookies.findIndex(c => c.startsWith(cookieName + '='));
      if (existingIndex >= 0) {
        this.cookies[existingIndex] = cookie;
      } else {
        this.cookies.push(cookie);
      }
    }
  }

  /**
   * Extract JSF ViewState from HTML
   */
  private extractViewState(html: string): string {
    const $ = cheerio.load(html);
    const viewState = $('input[name="javax.faces.ViewState"]').val();
    return (viewState as string) || '';
  }

  /**
   * Parse search results from HTML
   */
  private parseSearchResults(html: string): HandelsregisterEntry[] {
    const $ = cheerio.load(html);
    const results: HandelsregisterEntry[] = [];

    // Find the results table
    $('table[role="grid"] tbody tr[data-ri]').each((_, row) => {
      const cells = $(row).find('td');

      if (cells.length >= 4) {
        const courtText = $(cells[0]).text().trim();
        const name = $(cells[1]).text().trim();
        const state = $(cells[2]).text().trim();
        const status = $(cells[3]).text().trim();

        // Parse register type and number from court text
        // Format: "Amtsgericht Neuss HRB 15884" or just "Neuss HRB 15884"
        const registerMatch = courtText.match(/(HRA|HRB|GnR|VR|PR)\s*(\d+\s*\w*)/i);

        if (registerMatch) {
          results.push({
            name,
            court: courtText,
            registerType: registerMatch[1].toUpperCase(),
            registerNumber: registerMatch[2].trim(),
            state,
            status,
            statusCurrent: !status.toLowerCase().includes('gelöscht') &&
                          !status.toLowerCase().includes('aufgelöst'),
          });
        }
      }
    });

    return results;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const bundesApiService = new BundesApiService();
