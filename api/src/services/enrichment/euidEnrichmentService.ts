/**
 * EUID Enrichment Service
 *
 * Generates European Unique Identifiers (EUID) for ALL EU member states.
 * EUID is part of the Business Registers Interconnection System (BRIS).
 *
 * EUID Format varies by country:
 * - Simple format: {CC}.{Registry}.{Number} (e.g., NL.KVK.12345678)
 * - Complex format: {CC}{RegisterCode}.{Type}{Number} (e.g., DEK1101R.HRB116737)
 *
 * @see https://e-justice.europa.eu/489/EN/business_registers
 * @see docs/ENRICHMENT_ARCHITECTURE.md
 */

import { randomUUID } from 'crypto';
import { EnrichmentContext, EnrichmentResult, getExistingValue } from './types';

/**
 * EUID configuration per country
 *
 * Each entry defines:
 * - sourceIdentifiers: Identifier types that can be used to generate EUID
 * - format: Function to generate EUID from source identifier
 * - requiresRegistryData: Whether additional registry data is needed (e.g., court code for DE)
 */
interface EuidCountryConfig {
  sourceIdentifiers: string[];
  format: (identifierType: string, identifierValue: string, registryData?: any) => string | null;
  requiresRegistryData?: boolean;
}

const EUID_COUNTRY_CONFIG: Record<string, EuidCountryConfig> = {
  // Netherlands - Simple format: NL.KVK.{number}
  NL: {
    sourceIdentifiers: ['KVK'],
    format: (type, value) => `NL.KVK.${value}`,
  },

  // Belgium - Simple format: BE.KBO.{number}
  BE: {
    sourceIdentifiers: ['KBO', 'BCE'],
    format: (type, value) => {
      // Belgian KBO numbers are 10 digits, often formatted as 0XXX.XXX.XXX
      const cleanValue = value.replace(/\D/g, '');
      return `BE.KBO.${cleanValue}`;
    },
  },

  // France - Format: FR.RCS.{SIREN} or FR.SIRET.{number}
  FR: {
    sourceIdentifiers: ['SIREN', 'SIRET', 'RCS'],
    format: (type, value) => {
      const cleanValue = value.replace(/\D/g, '');
      if (type === 'SIRET' && cleanValue.length === 14) {
        // SIRET is 14 digits (SIREN + NIC)
        return `FR.SIRET.${cleanValue}`;
      }
      // SIREN is 9 digits
      return `FR.SIREN.${cleanValue.substring(0, 9)}`;
    },
  },

  // Germany - Complex format: DE{courtCode}.{type}{number}
  // Requires registry data for court code
  DE: {
    sourceIdentifiers: ['HRB', 'HRA'],
    format: (type, value, registryData) => {
      if (!registryData?.register_court_code) {
        return null; // Cannot generate without court code
      }
      // Extract just the number from HRB/HRA (e.g., "HRB 15884" -> "15884")
      const match = value.match(/(\d+)/);
      if (!match) return null;
      const number = match[1];
      return `DE${registryData.register_court_code}.${type}${number}`;
    },
    requiresRegistryData: true,
  },

  // Austria - Format: AT.FB.{number}
  AT: {
    sourceIdentifiers: ['FB'],
    format: (type, value) => {
      // Austrian Firmenbuch number (e.g., FN 123456a)
      const cleanValue = value.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
      return `AT.FB.${cleanValue}`;
    },
  },

  // Italy - Format: IT.REA.{number}
  IT: {
    sourceIdentifiers: ['REA'],
    format: (type, value) => `IT.REA.${value}`,
  },

  // Spain - Format: ES.CIF.{number}
  ES: {
    sourceIdentifiers: ['CIF'],
    format: (type, value) => `ES.CIF.${value.toUpperCase()}`,
  },

  // Denmark - Format: DK.CVR.{number}
  DK: {
    sourceIdentifiers: ['CVR'],
    format: (type, value) => {
      const cleanValue = value.replace(/\D/g, '');
      return `DK.CVR.${cleanValue}`;
    },
  },

  // Poland - Format: PL.KRS.{number}
  PL: {
    sourceIdentifiers: ['KRS'],
    format: (type, value) => {
      // KRS is 10 digits, often with leading zeros
      const cleanValue = value.replace(/\D/g, '').padStart(10, '0');
      return `PL.KRS.${cleanValue}`;
    },
  },

  // Switzerland - Format: CH.CHR.{UID}
  CH: {
    sourceIdentifiers: ['CHR', 'UID'],
    format: (type, value) => {
      // Swiss UID format: CHE-XXX.XXX.XXX
      const cleanValue = value.replace(/\D/g, '');
      return `CH.CHR.${cleanValue}`;
    },
  },

  // Luxembourg - Format: LU.RCS.{number}
  LU: {
    sourceIdentifiers: ['RCS'],
    format: (type, value) => `LU.RCS.${value}`,
  },

  // Portugal - Format: PT.NIF.{number}
  PT: {
    sourceIdentifiers: ['NIF'],
    format: (type, value) => {
      const cleanValue = value.replace(/\D/g, '');
      return `PT.NIF.${cleanValue}`;
    },
  },

  // Ireland - Format: IE.CRO.{number}
  IE: {
    sourceIdentifiers: ['CRO'],
    format: (type, value) => `IE.CRO.${value}`,
  },

  // Sweden - Format: SE.ORG.{number}
  SE: {
    sourceIdentifiers: ['ORG'],
    format: (type, value) => {
      // Swedish organization number: 10 digits
      const cleanValue = value.replace(/\D/g, '');
      return `SE.ORG.${cleanValue}`;
    },
  },

  // Finland - Format: FI.YTJ.{number}
  FI: {
    sourceIdentifiers: ['YTJ', 'BID'],
    format: (type, value) => {
      // Finnish business ID: 7 digits + dash + check digit
      const cleanValue = value.replace(/\D/g, '');
      return `FI.YTJ.${cleanValue}`;
    },
  },

  // Czech Republic - Format: CZ.ICO.{number}
  CZ: {
    sourceIdentifiers: ['ICO'],
    format: (type, value) => {
      // Czech ICO is 8 digits
      const cleanValue = value.replace(/\D/g, '').padStart(8, '0');
      return `CZ.ICO.${cleanValue}`;
    },
  },
};

/**
 * Enrich with EUID (European Unique Identifier)
 *
 * Works for ALL EU member states that have supported identifier types.
 *
 * Flow:
 * 1. Check if EUID already exists
 * 2. Find supported source identifier for the country
 * 3. Get registry data if required (e.g., German court code)
 * 4. Generate EUID using country-specific format
 * 5. Store EUID identifier
 */
export async function enrichEuid(ctx: EnrichmentContext): Promise<EnrichmentResult> {
  const { pool, legalEntityId, countryCode, existingTypes, existingIdentifiers } = ctx;

  // Check if EUID already exists
  if (existingTypes.has('EUID')) {
    return {
      identifier: 'EUID',
      status: 'exists',
      value: getExistingValue(existingIdentifiers, 'EUID'),
    };
  }

  // Check if country is supported
  const config = EUID_COUNTRY_CONFIG[countryCode];
  if (!config) {
    return {
      identifier: 'EUID',
      status: 'not_available',
      message: `EUID generation not yet supported for country: ${countryCode}`,
    };
  }

  // Find a source identifier
  let sourceIdentifier: { type: string; value: string } | null = null;
  for (const idType of config.sourceIdentifiers) {
    const value = getExistingValue(existingIdentifiers, idType);
    if (value) {
      sourceIdentifier = { type: idType, value };
      break;
    }
  }

  if (!sourceIdentifier) {
    return {
      identifier: 'EUID',
      status: 'not_available',
      message: `No source identifier found for EUID generation. Need one of: ${config.sourceIdentifiers.join(', ')}`,
    };
  }

  // Get registry data if required
  let registryData: any = null;
  if (config.requiresRegistryData) {
    if (countryCode === 'DE') {
      const { rows } = await pool.query(`
        SELECT register_court_code, register_type
        FROM german_registry_data
        WHERE legal_entity_id = $1 AND is_deleted = false
        LIMIT 1
      `, [legalEntityId]);
      registryData = rows[0] || null;

      if (!registryData?.register_court_code) {
        return {
          identifier: 'EUID',
          status: 'not_available',
          message: 'Cannot generate German EUID without court code (run enrichment first)',
        };
      }
    }
  }

  // Generate EUID
  const euidValue = config.format(sourceIdentifier.type, sourceIdentifier.value, registryData);

  if (!euidValue) {
    return {
      identifier: 'EUID',
      status: 'not_available',
      message: `Failed to generate EUID from ${sourceIdentifier.type}: ${sourceIdentifier.value}`,
    };
  }

  // Store EUID
  await pool.query(`
    INSERT INTO legal_entity_number (
      legal_entity_reference_id, legal_entity_id,
      identifier_type, identifier_value, country_code,
      validation_status, registry_name, registry_url,
      verification_notes, dt_created, dt_modified
    )
    VALUES ($1, $2, 'EUID', $3, $4, 'VALIDATED', 'BRIS', 'https://e-justice.europa.eu/489/EN/business_registers',
            $5, NOW(), NOW())
  `, [
    randomUUID(),
    legalEntityId,
    euidValue,
    countryCode,
    `Auto-generated from ${sourceIdentifier.type}`,
  ]);

  console.log(`[EUID Enrichment] Generated EUID for ${countryCode}: ${euidValue}`);

  return {
    identifier: 'EUID',
    status: 'added',
    value: euidValue,
    message: `Generated from ${sourceIdentifier.type} number`,
  };
}

/**
 * Check if a country supports EUID generation
 */
export function supportsEuidGeneration(countryCode: string): boolean {
  return countryCode in EUID_COUNTRY_CONFIG;
}

/**
 * Get the source identifier types needed for EUID generation for a country
 */
export function getEuidSourceIdentifiers(countryCode: string): string[] {
  return EUID_COUNTRY_CONFIG[countryCode]?.sourceIdentifiers || [];
}
