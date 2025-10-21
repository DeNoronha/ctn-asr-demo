/**
 * Documentation Loader for CTN MCP Server
 *
 * Fetches and parses documentation from the Static Web App.
 * Builds a searchable index and caches content in memory.
 * Optimized for low memory usage (<128MB cache).
 */

const https = require('https');
const http = require('http');
const { JSDOM } = require('jsdom');

/**
 * Documentation store with in-memory cache
 */
class DocumentationLoader {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.pages = new Map(); // Map<path, pageData>
    this.searchIndex = []; // Array of searchable content
    this.lastRefresh = null;
    this.isRefreshing = false;
  }

  /**
   * Fetch HTML content from a URL
   * @param {string} url - URL to fetch
   * @returns {Promise<string>} HTML content
   */
  async fetchUrl(url) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      const timeoutMs = this.config.refreshTimeoutMs;

      const req = protocol.get(url, { timeout: timeoutMs }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          // Follow redirects
          return this.fetchUrl(res.headers.location).then(resolve).catch(reject);
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }

        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => resolve(data));
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${timeoutMs}ms for ${url}`));
      });
    });
  }

  /**
   * Extract links from HTML page
   * @param {Document} document - JSDOM document
   * @param {string} baseUrl - Base URL for resolving relative links
   * @returns {Array<string>} Array of absolute URLs
   */
  extractLinks(document, baseUrl) {
    const links = new Set();
    const anchorElements = document.querySelectorAll('a[href]');

    anchorElements.forEach(anchor => {
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) {
        return;
      }

      try {
        const absoluteUrl = new URL(href, baseUrl).href;
        // Only include links from the same domain
        if (absoluteUrl.startsWith(baseUrl)) {
          links.add(absoluteUrl);
        }
      } catch (e) {
        // Invalid URL, skip
      }
    });

    return Array.from(links);
  }

  /**
   * Extract clean text content from HTML
   * @param {Document} document - JSDOM document
   * @returns {Object} Extracted content with metadata
   */
  extractContent(document) {
    // Remove script, style, nav, footer elements
    const elementsToRemove = document.querySelectorAll('script, style, nav, footer, .nav, .footer');
    elementsToRemove.forEach(el => el.remove());

    // Extract title
    const titleElement = document.querySelector('title') || document.querySelector('h1');
    const title = titleElement ? titleElement.textContent.trim() : 'Untitled';

    // Extract main content
    const mainElement = document.querySelector('main, article, .content, .documentation') || document.body;
    const textContent = mainElement ? mainElement.textContent : document.body.textContent;

    // Clean up whitespace
    const cleanText = textContent
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    // Extract headings for structure
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .map(h => ({
        level: parseInt(h.tagName.substring(1)),
        text: h.textContent.trim(),
      }));

    return {
      title,
      content: cleanText,
      headings,
      wordCount: cleanText.split(/\s+/).length,
    };
  }

  /**
   * Crawl documentation site starting from base URL
   * @param {string} startUrl - Starting URL
   * @param {number} maxPages - Maximum pages to crawl (safety limit)
   * @returns {Promise<Map>} Map of URL to page data
   */
  async crawlDocumentation(startUrl, maxPages = 200) {
    const visited = new Set();
    const toVisit = [startUrl];
    const pages = new Map();

    this.logger.info({ message: 'Starting documentation crawl', startUrl, maxPages });

    while (toVisit.length > 0 && visited.size < maxPages) {
      const url = toVisit.shift();
      if (visited.has(url)) continue;

      visited.add(url);

      try {
        this.logger.debug({ message: 'Fetching page', url, progress: `${visited.size}/${maxPages}` });

        const html = await this.fetchUrl(url);
        const dom = new JSDOM(html);
        const document = dom.window.document;

        // Extract content
        const content = this.extractContent(document);

        // Create page entry
        const path = url.replace(startUrl, '') || '/';
        pages.set(path, {
          url,
          path,
          title: content.title,
          content: content.content,
          headings: content.headings,
          wordCount: content.wordCount,
        });

        // Extract and queue links
        const links = this.extractLinks(document, startUrl);
        links.forEach(link => {
          if (!visited.has(link)) {
            toVisit.push(link);
          }
        });

      } catch (error) {
        this.logger.warn({ message: 'Failed to fetch page', url, error: error.message });
      }
    }

    this.logger.info({ message: 'Documentation crawl completed', pagesFound: pages.size });
    return pages;
  }

  /**
   * Build search index from pages
   * @param {Map} pages - Map of pages
   * @returns {Array} Search index
   */
  buildSearchIndex(pages) {
    const index = [];

    pages.forEach((page, path) => {
      // Index page content
      index.push({
        path: page.path,
        title: page.title,
        content: page.content.substring(0, 5000), // Limit to first 5000 chars for search
        headings: page.headings.map(h => h.text).join(' '),
      });
    });

    return index;
  }

  /**
   * Search documentation content
   * @param {string} query - Search query
   * @param {number} maxResults - Maximum results to return
   * @returns {Array} Search results
   */
  search(query, maxResults = 10) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const queryLower = query.toLowerCase();
    const results = [];

    this.searchIndex.forEach(item => {
      const titleMatch = item.title.toLowerCase().includes(queryLower);
      const contentMatch = item.content.toLowerCase().includes(queryLower);
      const headingMatch = item.headings.toLowerCase().includes(queryLower);

      if (titleMatch || contentMatch || headingMatch) {
        // Calculate simple relevance score
        let score = 0;
        if (titleMatch) score += 10;
        if (headingMatch) score += 5;
        if (contentMatch) score += 1;

        // Extract snippet around match
        const contentLower = item.content.toLowerCase();
        const matchIndex = contentLower.indexOf(queryLower);
        const snippetStart = Math.max(0, matchIndex - 100);
        const snippetEnd = Math.min(item.content.length, matchIndex + 200);
        const snippet = item.content.substring(snippetStart, snippetEnd);

        results.push({
          path: item.path,
          title: item.title,
          snippet: snippetStart > 0 ? '...' + snippet : snippet,
          score,
        });
      }
    });

    // Sort by score and limit results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  /**
   * Get specific page by path
   * @param {string} path - Page path
   * @returns {Object|null} Page data or null if not found
   */
  getPage(path) {
    return this.pages.get(path) || null;
  }

  /**
   * List all available pages
   * @returns {Array} Array of page metadata
   */
  listPages() {
    return Array.from(this.pages.values()).map(page => ({
      path: page.path,
      title: page.title,
      wordCount: page.wordCount,
      headings: page.headings,
    }));
  }

  /**
   * Refresh documentation from source
   * @returns {Promise<Object>} Refresh result with statistics
   */
  async refresh() {
    if (this.isRefreshing) {
      throw new Error('Refresh already in progress');
    }

    this.isRefreshing = true;
    const startTime = Date.now();

    try {
      this.logger.info({ message: 'Starting documentation refresh', source: this.config.documentationUrl });

      // Crawl documentation
      const newPages = await this.crawlDocumentation(this.config.documentationUrl);

      // Build search index
      const newSearchIndex = this.buildSearchIndex(newPages);

      // Calculate memory usage estimate
      const memoryUsageMB = this.estimateMemoryUsage(newPages, newSearchIndex);

      if (memoryUsageMB > this.config.cacheMaxSizeMB) {
        this.logger.warn({
          message: 'Documentation cache exceeds max size',
          memoryUsageMB,
          maxSizeMB: this.config.cacheMaxSizeMB,
        });
      }

      // Update cache
      this.pages = newPages;
      this.searchIndex = newSearchIndex;
      this.lastRefresh = new Date();

      const duration = Date.now() - startTime;

      this.logger.info({
        message: 'Documentation refresh completed',
        pageCount: this.pages.size,
        memoryUsageMB: Math.round(memoryUsageMB * 100) / 100,
        durationMs: duration,
      });

      return {
        success: true,
        pageCount: this.pages.size,
        memoryUsageMB,
        durationMs: duration,
        timestamp: this.lastRefresh.toISOString(),
      };

    } catch (error) {
      this.logger.error({ message: 'Documentation refresh failed', error: error.message, stack: error.stack });
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Estimate memory usage of cache
   * @param {Map} pages - Pages map
   * @param {Array} searchIndex - Search index
   * @returns {number} Estimated memory usage in MB
   */
  estimateMemoryUsage(pages, searchIndex) {
    let totalBytes = 0;

    // Estimate pages map size
    pages.forEach(page => {
      totalBytes += JSON.stringify(page).length * 2; // UTF-16 chars
    });

    // Estimate search index size
    totalBytes += JSON.stringify(searchIndex).length * 2;

    return totalBytes / (1024 * 1024); // Convert to MB
  }

  /**
   * Get statistics about loaded documentation
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      pageCount: this.pages.size,
      lastRefresh: this.lastRefresh ? this.lastRefresh.toISOString() : null,
      isRefreshing: this.isRefreshing,
      memoryUsageMB: Math.round(this.estimateMemoryUsage(this.pages, this.searchIndex) * 100) / 100,
    };
  }
}

module.exports = DocumentationLoader;
