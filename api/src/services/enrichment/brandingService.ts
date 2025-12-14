/**
 * Branding Enrichment Service
 *
 * Handles company logo/branding enrichment from domain:
 * 1. Extract domain from legal_entity
 * 2. Fetch favicon from Google/DuckDuckGo services
 * 3. Store in legal_entity_branding table
 *
 * @see docs/ENRICHMENT_ARCHITECTURE.md
 */

import { EnrichmentContext } from './types';

interface BrandingResult {
  fetched: boolean;
  logoUrl: string | null;
}

/**
 * Enrich with company logo from domain
 *
 * Flow:
 * 1. Get domain from legal_entity
 * 2. Check if branding already exists
 * 3. If not, create branding record with favicon URLs
 */
export async function enrichBranding(ctx: EnrichmentContext): Promise<BrandingResult> {
  const { pool, legalEntityId } = ctx;

  try {
    // Get the domain from legal_entity
    const { rows: entityData } = await pool.query(`
      SELECT domain FROM legal_entity WHERE legal_entity_id = $1 AND is_deleted = false
    `, [legalEntityId]);

    const domain = entityData[0]?.domain;

    if (!domain) {
      return { fetched: false, logoUrl: null };
    }

    // Check if branding already exists
    const { rows: existingBranding } = await pool.query(`
      SELECT branding_id, logo_url FROM legal_entity_branding
      WHERE legal_entity_id = $1 AND is_deleted = false
    `, [legalEntityId]);

    if (existingBranding.length > 0) {
      console.log('[Branding] Branding already exists for legal entity');
      return { fetched: false, logoUrl: existingBranding[0].logo_url };
    }

    // Clean the domain
    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];

    // Favicon URLs from free services
    const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=128`;
    const ddgFaviconUrl = `https://icons.duckduckgo.com/ip3/${cleanDomain}.ico`;

    // Store branding data
    await pool.query(`
      INSERT INTO legal_entity_branding (
        legal_entity_id, logo_url, logo_source, logo_format,
        favicon_url, extracted_from_domain, extracted_at,
        dt_created, dt_modified, created_by
      )
      VALUES ($1, $2, 'google_favicon', 'png', $3, $4, NOW(), NOW(), NOW(), 'enrichment')
    `, [legalEntityId, googleFaviconUrl, ddgFaviconUrl, cleanDomain]);

    console.log('[Branding] Stored company branding for domain:', cleanDomain);
    return { fetched: true, logoUrl: googleFaviconUrl };

  } catch (brandingError: any) {
    console.warn('[Branding] Failed to fetch company branding:', brandingError.message);
    return { fetched: false, logoUrl: null };
  }
}
