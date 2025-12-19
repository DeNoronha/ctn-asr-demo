/**
 * Branding Controller
 *
 * Handles branding CRUD operations for legal entities.
 * Manages logo, colors, and theme preferences.
 *
 * @module controllers/branding
 */

import { Request, Response } from 'express';
import { getPool } from '../utils/database';

// ============================================================================
// BRANDING OPERATIONS
// ============================================================================

/**
 * GET /v1/legal-entities/:legalentityid/branding
 * Get branding data for a legal entity
 */
export async function getBranding(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;

    const { rows } = await pool.query(`
      SELECT
        branding_id,
        legal_entity_id,
        logo_url,
        logo_source,
        logo_format,
        favicon_url,
        primary_color,
        secondary_color,
        accent_color,
        background_color,
        text_color,
        preferred_theme,
        extracted_from_domain,
        extracted_at,
        dt_created,
        dt_modified
      FROM legal_entity_branding
      WHERE legal_entity_id = $1 AND is_deleted = false
      LIMIT 1
    `, [legalentityid]);

    if (rows.length === 0) {
      res.status(404).json({ error: 'No branding data found for this legal entity' });
      return;
    }

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error fetching branding:', {
      legalEntityId: req.params.legalentityid,
      error: error.message
    });
    res.status(500).json({ error: 'Failed to fetch branding', detail: error.message });
  }
}

/**
 * PUT /v1/legal-entities/:legalentityid/branding
 * Update branding for a legal entity (creates if not exists)
 */
export async function updateBranding(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;
    const {
      logo_url,
      primary_color,
      secondary_color,
      accent_color,
      background_color,
      text_color,
      preferred_theme
    } = req.body;

    // Check if branding exists
    const { rows: existing } = await pool.query(`
      SELECT branding_id FROM legal_entity_branding
      WHERE legal_entity_id = $1 AND is_deleted = false
    `, [legalentityid]);

    if (existing.length === 0) {
      // Insert new record
      const { rows } = await pool.query(`
        INSERT INTO legal_entity_branding (
          legal_entity_id, logo_url, logo_source,
          primary_color, secondary_color, accent_color,
          background_color, text_color, preferred_theme,
          dt_created, dt_modified, created_by
        )
        VALUES ($1, $2, 'manual', $3, $4, $5, $6, $7, $8, NOW(), NOW(), 'admin')
        RETURNING *
      `, [legalentityid, logo_url, primary_color, secondary_color, accent_color, background_color, text_color, preferred_theme || 'light']);

      res.status(201).json(rows[0]);
      return;
    }

    // Update existing record
    const { rows } = await pool.query(`
      UPDATE legal_entity_branding SET
        logo_url = COALESCE($2, logo_url),
        logo_source = CASE WHEN $2 IS NOT NULL THEN 'manual' ELSE logo_source END,
        primary_color = COALESCE($3, primary_color),
        secondary_color = COALESCE($4, secondary_color),
        accent_color = COALESCE($5, accent_color),
        background_color = COALESCE($6, background_color),
        text_color = COALESCE($7, text_color),
        preferred_theme = COALESCE($8, preferred_theme),
        dt_modified = NOW(),
        modified_by = 'admin'
      WHERE legal_entity_id = $1 AND is_deleted = false
      RETURNING *
    `, [legalentityid, logo_url, primary_color, secondary_color, accent_color, background_color, text_color, preferred_theme]);

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error updating branding:', {
      legalEntityId: req.params.legalentityid,
      error: error.message
    });
    res.status(500).json({ error: 'Failed to update branding', detail: error.message });
  }
}
