/**
 * EUID Service
 *
 * Service for automatically generating European Unique Identifiers (EUID)
 * based on national identifiers like KvK numbers.
 *
 * EUID Format: {CountryCode}{RegisterCode}.{Number}
 * - Netherlands: NLNHR.{kvk} (e.g., NLNHR.51096072) - NHR = Nationaal Handelsregister
 * - Germany: DE{court}.{type}{nr} (e.g., DEK1101R.HRB116737)
 * - Belgium: BEKBOBCE.{kbo} (e.g., BEKBOBCE.0656727414)
 *
 * @see https://e-justice.europa.eu/topics/registers-business-insolvency-land/business-registers-search-company-eu_en
 * @see EU Verordening 2021/1042
 */

import { getPool } from '../utils/database';
import { InvocationContext } from '@azure/functions';

/**
 * Supported national identifier types for EUID generation
 * Maps identifier type to { countryCode, registerCode }
 */
const EUID_MAPPING: Record<string, { countryCode: string; registerCode: string }> = {
  KVK: { countryCode: 'NL', registerCode: 'NHR' },    // Netherlands - Nationaal Handelsregister
  HRB: { countryCode: 'DE', registerCode: '' },       // Germany - Handelsregister Teil B (court code varies)
  HRA: { countryCode: 'DE', registerCode: '' },       // Germany - Handelsregister Teil A (court code varies)
  KBO: { countryCode: 'BE', registerCode: 'KBOBCE' }, // Belgium - Kruispuntbank van Ondernemingen
  SIREN: { countryCode: 'FR', registerCode: 'RCS' },  // France - Registre du Commerce et des Sociétés
  CRN: { countryCode: 'GB', registerCode: 'CH' },     // United Kingdom - Companies House
};

/**
 * Interface for EUID generation result
 */
export interface EuidGenerationResult {
  euid_value: string;
  source_identifier_type: string;
  source_identifier_value: string;
  country_code: string;
  was_created: boolean;
  was_updated: boolean;
  identifier_id?: string;
}

/**
 * Validates a KvK number (8 digits)
 */
export function validateKvkNumber(kvkNumber: string): boolean {
  return /^\d{8}$/.test(kvkNumber.trim());
}

/**
 * Generates an EUID from a national identifier
 *
 * @param identifierType - Type of national identifier (e.g., 'KVK', 'HRB')
 * @param identifierValue - Value of the national identifier
 * @returns Generated EUID string
 * @throws Error if identifier type is not supported or value is invalid
 *
 * Format: {CountryCode}{RegisterCode}.{Number}
 * - NL (KVK): NLNHR.{kvk} (e.g., NLNHR.51096072)
 * - DE (HRB/HRA): Requires court code - not auto-generated
 * - BE (KBO): BEKBOBCE.{kbo} (e.g., BEKBOBCE.0656727414)
 */
export function generateEuid(identifierType: string, identifierValue: string): string {
  const mapping = EUID_MAPPING[identifierType.toUpperCase()];

  if (!mapping) {
    throw new Error(`EUID generation not supported for identifier type: ${identifierType}`);
  }

  const cleanedValue = identifierValue.trim().replace(/\./g, ''); // Remove dots for KBO

  // Validate based on type
  if (identifierType.toUpperCase() === 'KVK' && !validateKvkNumber(cleanedValue)) {
    throw new Error('Invalid KvK number format. Must be exactly 8 digits.');
  }

  // German registers require court code which varies - cannot auto-generate
  if (['HRB', 'HRA'].includes(identifierType.toUpperCase())) {
    throw new Error('German EUID requires court code. Cannot auto-generate - please enter manually.');
  }

  // Generate EUID in format: {CountryCode}{RegisterCode}.{Value}
  return `${mapping.countryCode}${mapping.registerCode}.${cleanedValue}`;
}

/**
 * Synchronizes EUID for a legal entity based on a national identifier
 *
 * This function:
 * 1. Checks if an EUID already exists for the entity
 * 2. If exists and source identifier matches, returns existing EUID
 * 3. If exists but source changed, updates the EUID
 * 4. If not exists, creates a new EUID
 *
 * @param legalEntityId - UUID of the legal entity
 * @param identifierType - Type of national identifier (e.g., 'KVK')
 * @param identifierValue - Value of the national identifier
 * @param userEmail - Email of user performing the action (for audit)
 * @param context - Azure Functions invocation context for logging
 * @returns Result of EUID generation including the EUID value and operation performed
 */
export async function syncEuidForEntity(
  legalEntityId: string,
  identifierType: string,
  identifierValue: string,
  userEmail: string,
  context: InvocationContext
): Promise<EuidGenerationResult> {
  const pool = getPool();

  // Generate the EUID value
  const euidValue = generateEuid(identifierType, identifierValue);
  const mapping = EUID_MAPPING[identifierType.toUpperCase()];
  const countryCode = mapping.countryCode;

  context.log(`Generating EUID for entity ${legalEntityId}: ${euidValue}`);

  try {
    // Check if EUID already exists for this entity
    const existingEuidQuery = await pool.query(
      `SELECT legal_entity_reference_id, identifier_value, verification_notes
       FROM legal_entity_number
       WHERE legal_entity_id = $1
         AND identifier_type = 'EUID'
         AND is_deleted = false
       LIMIT 1`,
      [legalEntityId]
    );

    if (existingEuidQuery.rows.length > 0) {
      const existingEuid = existingEuidQuery.rows[0];

      // If EUID value is the same, no update needed
      if (existingEuid.identifier_value === euidValue) {
        context.log(`EUID already exists with correct value: ${euidValue}`);
        return {
          euid_value: euidValue,
          source_identifier_type: identifierType,
          source_identifier_value: identifierValue,
          country_code: countryCode,
          was_created: false,
          was_updated: false,
          identifier_id: existingEuid.legal_entity_reference_id,
        };
      }

      // Update existing EUID with new value
      context.log(`Updating existing EUID from ${existingEuid.identifier_value} to ${euidValue}`);

      const updateResult = await pool.query(
        `UPDATE legal_entity_number
         SET identifier_value = $1,
             verification_notes = $2,
             dt_modified = CURRENT_TIMESTAMP,
             modified_by = $3
         WHERE legal_entity_reference_id = $4
         RETURNING legal_entity_reference_id`,
        [
          euidValue,
          `Auto-updated from ${identifierType}: ${identifierValue}`,
          userEmail,
          existingEuid.legal_entity_reference_id
        ]
      );

      return {
        euid_value: euidValue,
        source_identifier_type: identifierType,
        source_identifier_value: identifierValue,
        country_code: countryCode,
        was_created: false,
        was_updated: true,
        identifier_id: updateResult.rows[0].legal_entity_reference_id,
      };
    }

    // Create new EUID
    context.log(`Creating new EUID: ${euidValue}`);

    const insertResult = await pool.query(
      `INSERT INTO legal_entity_number
       (legal_entity_id, identifier_type, identifier_value, country_code,
        registry_name, registry_url, validation_status, verification_notes,
        created_by, dt_created, dt_modified)
       VALUES ($1, 'EUID', $2, $3, $4, $5, 'VALIDATED', $6, $7,
               CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING legal_entity_reference_id`,
      [
        legalEntityId,
        euidValue,
        countryCode,
        'European Unique Identifier (BRIS)',
        'https://e-justice.europa.eu/topics/registers-business-insolvency-land/business-registers-search-company-eu_en',
        `Auto-generated from ${identifierType}: ${identifierValue}`,
        userEmail
      ]
    );

    return {
      euid_value: euidValue,
      source_identifier_type: identifierType,
      source_identifier_value: identifierValue,
      country_code: countryCode,
      was_created: true,
      was_updated: false,
      identifier_id: insertResult.rows[0].legal_entity_reference_id,
    };

  } catch (error) {
    context.error('Error syncing EUID:', error);
    throw error;
  }
}

/**
 * Checks if an identifier type supports EUID generation
 */
export function supportsEuidGeneration(identifierType: string): boolean {
  const type = identifierType.toUpperCase();
  // German registers require court code - cannot auto-generate
  if (['HRB', 'HRA'].includes(type)) {
    return false;
  }
  return type in EUID_MAPPING;
}
