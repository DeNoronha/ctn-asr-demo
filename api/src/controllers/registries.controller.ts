/**
 * Registries Controller
 *
 * Handles country-specific business registry operations.
 * Supports LEI (GLEIF), KVK (Netherlands), German Handelsregister, and Belgian KBO.
 *
 * @module controllers/registries
 */

import { Request, Response } from 'express';
import { getPool } from '../utils/database';

// ============================================================================
// LEI REGISTRY (GLEIF - Global Legal Entity Identifier Foundation)
// ============================================================================

/**
 * GET /v1/legal-entities/:legalentityid/lei-registry
 * Get GLEIF registry data for a legal entity's LEI
 */
export async function getLeiRegistry(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;

    // Get the LEI identifier for this legal entity
    const { rows: identifiers } = await pool.query(`
      SELECT legal_entity_reference_id, identifier_value
      FROM legal_entity_number
      WHERE legal_entity_id = $1 AND identifier_type = 'LEI' AND is_deleted = false
      LIMIT 1
    `, [legalentityid]);

    if (identifiers.length === 0) {
      res.status(404).json({ error: 'No LEI identifier found for this legal entity' });
      return;
    }

    const leiCode = identifiers[0].identifier_value;

    // Get the GLEIF registry data if available
    const { rows } = await pool.query(`
      SELECT
        registry_data_id,
        lei,
        legal_name,
        legal_address,
        headquarters_address,
        registration_authority_id,
        registered_as,
        registration_status,
        entity_status,
        initial_registration_date,
        last_update_date,
        next_renewal_date,
        managing_lou,
        raw_api_response,
        fetched_at,
        dt_created,
        dt_modified
      FROM gleif_registry_data
      WHERE legal_entity_id = $1
      ORDER BY fetched_at DESC
      LIMIT 1
    `, [legalentityid]);

    if (rows.length === 0) {
      // Auto-fetch GLEIF data when LEI exists but registry data is missing
      console.log(`No GLEIF registry data for ${leiCode}, fetching from GLEIF API...`);
      try {
        const { fetchLeiByCode, storeGleifRegistryData } = await import('../services/leiService');
        const gleifRecord = await fetchLeiByCode(leiCode);

        if (gleifRecord) {
          // Store the fetched data
          await storeGleifRegistryData(pool, legalentityid, gleifRecord);

          // Return the freshly fetched data
          const entity = gleifRecord.attributes.entity;
          const registration = gleifRecord.attributes.registration;

          res.json({
            lei: leiCode,
            hasData: true,
            data: {
              legalName: entity.legalName?.name,
              legalAddress: entity.legalAddress,
              headquartersAddress: entity.headquartersAddress,
              registrationAuthority: entity.registrationAuthority?.id,
              registrationNumber: entity.registeredAs,
              registrationStatus: registration?.registrationStatus,
              entityStatus: null,
              initialRegistrationDate: registration?.registrationDate,
              lastUpdateDate: registration?.lastUpdateDate,
              nextRenewalDate: null,
              managingLou: null,
              rawResponse: gleifRecord
            },
            fetchedAt: new Date().toISOString(),
            message: 'GLEIF data fetched on-demand'
          });
          return;
        } else {
          res.json({
            lei: leiCode,
            hasData: false,
            message: 'LEI not found in GLEIF database'
          });
          return;
        }
      } catch (gleifError: any) {
        console.error('Failed to fetch GLEIF data on-demand:', gleifError.message);
        res.json({
          lei: leiCode,
          hasData: false,
          message: `Failed to fetch GLEIF registry data: ${gleifError.message}`
        });
        return;
      }
    }

    const data = rows[0];
    res.json({
      lei: leiCode,
      hasData: true,
      data: {
        legalName: data.legal_name,
        legalAddress: data.legal_address,
        headquartersAddress: data.headquarters_address,
        registrationAuthority: data.registration_authority_id,
        registrationNumber: data.registered_as,
        registrationStatus: data.registration_status,
        entityStatus: data.entity_status,
        initialRegistrationDate: data.initial_registration_date,
        lastUpdateDate: data.last_update_date,
        nextRenewalDate: data.next_renewal_date,
        managingLou: data.managing_lou,
        rawResponse: data.raw_api_response
      },
      fetchedAt: data.fetched_at
    });
  } catch (error: any) {
    console.error('Error fetching LEI registry data:', {
      legalEntityId: req.params.legalentityid,
      error: error.message,
      stack: error.stack,
      detail: error.detail || error.toString()
    });
    res.status(500).json({ error: 'Failed to fetch LEI registry data', detail: error.message });
  }
}

// ============================================================================
// KVK REGISTRY (Netherlands Chamber of Commerce)
// ============================================================================

/**
 * GET /v1/legal-entities/:legalentityid/kvk-registry
 * Get KvK registry data for a Dutch legal entity
 */
export async function getKvkRegistry(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;

    // First check kvk_registry_data table (primary source - from KvK API)
    const { rows: kvkData } = await pool.query(`
      SELECT
        registry_data_id,
        kvk_number,
        company_name,
        legal_form,
        trade_names,
        formal_registration_date,
        material_registration_date,
        material_end_date,
        company_status,
        addresses,
        sbi_activities,
        total_employees,
        fulltime_employees,
        parttime_employees,
        kvk_profile_url,
        establishment_profile_url,
        fetched_at,
        last_verified_at,
        data_source,
        statutory_name,
        rsin,
        vestigingsnummer,
        ind_hoofdvestiging,
        ind_commerciele_vestiging,
        ind_non_mailing,
        primary_trade_name,
        rechtsvorm,
        total_branches,
        commercial_branches,
        non_commercial_branches,
        websites,
        geo_data
      FROM kvk_registry_data
      WHERE legal_entity_id = $1 AND is_deleted = false
      ORDER BY fetched_at DESC
      LIMIT 1
    `, [legalentityid]);

    if (kvkData.length > 0) {
      res.json(kvkData[0]);
      return;
    }

    // Fallback: Check identifier_verification_history for extracted data
    const { rows: identifiers } = await pool.query(`
      SELECT legal_entity_reference_id, identifier_value
      FROM legal_entity_number
      WHERE legal_entity_id = $1 AND identifier_type = 'KVK' AND is_deleted = false
      LIMIT 1
    `, [legalentityid]);

    if (identifiers.length === 0) {
      res.status(404).json({ error: 'No KvK identifier found for this legal entity' });
      return;
    }

    const kvkNumber = identifiers[0].identifier_value;
    const identifierId = identifiers[0].legal_entity_reference_id;

    // Get the most recent verification with extracted KvK API data
    const { rows } = await pool.query(`
      SELECT
        verification_id,
        extracted_data,
        verification_status,
        verification_method,
        verified_at,
        created_at
      FROM identifier_verification_history
      WHERE legal_entity_id = $1
        AND identifier_id = $2
        AND identifier_type = 'KVK'
        AND extracted_data IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
    `, [legalentityid, identifierId]);

    if (rows.length === 0) {
      res.json({
        kvkNumber,
        hasData: false,
        message: 'No KvK registry data available. Upload a KvK document or trigger verification.'
      });
      return;
    }

    res.json({
      kvkNumber,
      hasData: true,
      data: rows[0].extracted_data,
      verificationStatus: rows[0].verification_status,
      verificationMethod: rows[0].verification_method,
      verifiedAt: rows[0].verified_at,
      fetchedAt: rows[0].created_at
    });
  } catch (error: any) {
    console.error('Error fetching KvK registry data:', {
      legalEntityId: req.params.legalentityid,
      error: error.message,
      stack: error.stack,
      detail: error.detail || error.toString()
    });
    res.status(500).json({ error: 'Failed to fetch KvK registry data', detail: error.message });
  }
}

// ============================================================================
// GERMAN REGISTRY (Handelsregister)
// ============================================================================

/**
 * GET /v1/legal-entities/:legalentityid/german-registry
 * Get German Handelsregister data for a legal entity
 */
export async function getGermanRegistry(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;

    // Fetch from german_registry_data table
    const { rows: germanData } = await pool.query(`
      SELECT
        registry_data_id,
        register_number,
        register_type,
        register_court,
        register_court_code,
        euid,
        company_name,
        legal_form,
        legal_form_long,
        company_status,
        registration_date,
        dissolution_date,
        street,
        house_number,
        postal_code,
        city,
        country,
        full_address,
        business_purpose,
        share_capital,
        share_capital_currency,
        representatives,
        shareholders,
        is_main_establishment,
        branch_count,
        vat_number,
        lei,
        data_source,
        source_url,
        fetched_at,
        last_verified_at
      FROM german_registry_data
      WHERE legal_entity_id = $1 AND is_deleted = false
      ORDER BY fetched_at DESC
      LIMIT 1
    `, [legalentityid]);

    if (germanData.length > 0) {
      res.json(germanData[0]);
      return;
    }

    // Check if this is a German company
    const { rows: entityData } = await pool.query(`
      SELECT country_code FROM legal_entity
      WHERE legal_entity_id = $1 AND is_deleted = false
    `, [legalentityid]);

    if (entityData.length === 0) {
      res.status(404).json({ error: 'Legal entity not found' });
      return;
    }

    if (entityData[0].country_code !== 'DE') {
      res.json({
        hasData: false,
        message: 'Not a German company. German registry data only available for DE entities.'
      });
      return;
    }

    // Check for HRB/HRA identifier
    const { rows: identifiers } = await pool.query(`
      SELECT identifier_type, identifier_value
      FROM legal_entity_number
      WHERE legal_entity_id = $1
        AND identifier_type IN ('HRB', 'HRA')
        AND is_deleted = false
      LIMIT 1
    `, [legalentityid]);

    if (identifiers.length > 0) {
      res.json({
        hasData: false,
        registerNumber: identifiers[0].identifier_value,
        registerType: identifiers[0].identifier_type,
        message: 'Register number found but detailed data not yet fetched. Click Enrich to fetch full registry data.'
      });
      return;
    }

    res.json({
      hasData: false,
      message: 'No German Handelsregister data available. Click Enrich to search for company data.'
    });
  } catch (error: any) {
    console.error('Error fetching German registry data:', {
      legalEntityId: req.params.legalentityid,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to fetch German registry data', detail: error.message });
  }
}

// ============================================================================
// BELGIUM REGISTRY (KBO - Kruispuntbank van Ondernemingen)
// ============================================================================

/**
 * GET /v1/legal-entities/:legalentityid/belgium-registry
 * Get Belgian KBO registry data for a legal entity
 */
export async function getBelgiumRegistry(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;

    // Get Belgium registry data for this legal entity
    const { rows } = await pool.query(`
      SELECT
        registry_data_id,
        kbo_number,
        kbo_number_clean,
        enterprise_type,
        enterprise_type_code,
        company_name,
        legal_form,
        legal_form_full,
        company_status,
        status_start_date,
        start_date,
        end_date,
        street,
        house_number,
        bus_number,
        postal_code,
        city,
        country,
        full_address,
        vat_number,
        vat_status,
        vat_start_date,
        nace_codes,
        main_activity,
        representatives,
        establishment_count,
        establishments,
        lei,
        data_source,
        source_url,
        raw_response,
        fetched_at,
        last_verified_at,
        dt_created,
        dt_modified
      FROM belgium_registry_data
      WHERE legal_entity_id = $1 AND is_deleted = false
      ORDER BY fetched_at DESC
      LIMIT 1
    `, [legalentityid]);

    if (rows.length === 0) {
      res.json({
        hasData: false,
        message: 'No Belgian KBO registry data available. Use the enrichment endpoint to fetch data.'
      });
      return;
    }

    res.json({
      hasData: true,
      data: rows[0]
    });
  } catch (error: any) {
    console.error('Error fetching Belgium registry data:', {
      legalEntityId: req.params.legalentityid,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to fetch Belgium registry data', detail: error.message });
  }
}
