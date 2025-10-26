/**
 * Backfill Script: Update existing KvK registry records with comprehensive data
 *
 * Purpose: Existing records in kvk_registry_data table have null values for:
 * - legal_form
 * - formal_registration_date
 * - material_registration_date
 * - sbi_activities
 * - total_employees
 *
 * This script fetches comprehensive data from the KvK API and updates existing records.
 *
 * Usage: npx ts-node scripts/backfill-kvk-registry-data.ts
 */

import { Pool } from 'pg';
import axios from 'axios';

// Database connection
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// KvK API configuration
const KVK_API_KEY = process.env.KVK_API_KEY;
const KVK_BASE_URL = 'https://api.kvk.nl/api/v1';

interface KvKApiResponse {
  kvkNummer: string;
  naam: string;
  status?: string;
  formeleRegistratiedatum?: string;
  materieleRegistratie?: {
    datumAanvang?: string;
  };
  totaalWerkzamePersonen?: number;
  handelsnamen?: Array<{
    naam: string;
    volgorde: number;
  }>;
  sbiActiviteiten?: Array<{
    sbiCode: string;
    sbiOmschrijving: string;
    indHoofdactiviteit: string;
  }>;
  _embedded?: {
    hoofdvestiging?: {
      adressen?: Array<{
        type?: string;
        straatnaam?: string;
        huisnummer?: string;
        postcode?: string;
        plaats?: string;
        land?: string;
      }>;
    };
    eigenaar?: {
      rechtsvorm?: string;
      uitgebreideRechtsvorm?: string;
    };
  };
}

async function fetchKvKData(kvkNumber: string): Promise<KvKApiResponse | null> {
  if (!KVK_API_KEY) {
    console.error('❌ KVK_API_KEY not configured');
    return null;
  }

  try {
    console.log(`   Fetching data for KvK ${kvkNumber}...`);
    const response = await axios.get(`${KVK_BASE_URL}/basisprofielen/${kvkNumber}`, {
      headers: {
        'apikey': KVK_API_KEY,
      },
      timeout: 10000,
    });

    return response.data as KvKApiResponse;
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.error(`   ❌ KvK ${kvkNumber} not found in registry`);
    } else {
      console.error(`   ❌ Error fetching KvK ${kvkNumber}:`, error.message);
    }
    return null;
  }
}

async function updateKvKRecord(recordId: number, apiData: KvKApiResponse) {
  const legalForm = apiData._embedded?.eigenaar?.uitgebreideRechtsvorm || apiData._embedded?.eigenaar?.rechtsvorm;
  const formalRegistrationDate = apiData.formeleRegistratiedatum;
  const materialRegistrationDate = apiData.materieleRegistratie?.datumAanvang;
  const totalEmployees = apiData.totaalWerkzamePersonen;
  const sbiActivities = apiData.sbiActiviteiten;

  try {
    await pool.query(
      `UPDATE kvk_registry_data
       SET legal_form = $1,
           formal_registration_date = $2,
           material_registration_date = $3,
           total_employees = $4,
           sbi_activities = $5,
           raw_api_response = $6,
           last_verified_at = NOW(),
           modified_by = 'backfill-script'
       WHERE id = $7`,
      [
        legalForm,
        formalRegistrationDate,
        materialRegistrationDate,
        totalEmployees,
        JSON.stringify(sbiActivities),
        JSON.stringify(apiData),
        recordId
      ]
    );

    console.log(`   ✅ Updated record ${recordId}`);
    return true;
  } catch (error: any) {
    console.error(`   ❌ Error updating record ${recordId}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔄 Starting KvK Registry Data Backfill...\n');

  if (!KVK_API_KEY) {
    console.error('❌ KVK_API_KEY environment variable not set');
    console.error('   Set it in your .env file or environment');
    process.exit(1);
  }

  try {
    // Find records with missing data
    const result = await pool.query(
      `SELECT id, legal_entity_id, kvk_number, company_name
       FROM kvk_registry_data
       WHERE is_deleted = FALSE
         AND (legal_form IS NULL
              OR sbi_activities IS NULL
              OR total_employees IS NULL
              OR formal_registration_date IS NULL
              OR material_registration_date IS NULL)
       ORDER BY id`
    );

    const records = result.rows;
    console.log(`📊 Found ${records.length} records needing backfill\n`);

    if (records.length === 0) {
      console.log('✅ No records need backfilling. All records have comprehensive data.');
      await pool.end();
      return;
    }

    let successCount = 0;
    let failureCount = 0;

    for (const record of records) {
      console.log(`\n🔍 Processing record ${record.id}:`);
      console.log(`   Company: ${record.company_name}`);
      console.log(`   KvK: ${record.kvk_number}`);
      console.log(`   Legal Entity: ${record.legal_entity_id}`);

      const apiData = await fetchKvKData(record.kvk_number);

      if (apiData) {
        const success = await updateKvKRecord(record.id, apiData);
        if (success) {
          successCount++;
        } else {
          failureCount++;
        }
      } else {
        failureCount++;
      }

      // Rate limiting: wait 1 second between API calls
      if (records.indexOf(record) < records.length - 1) {
        console.log('   ⏳ Waiting 1 second (rate limiting)...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('\n\n✅ Backfill Complete!');
    console.log(`   Successfully updated: ${successCount} records`);
    console.log(`   Failed: ${failureCount} records`);

  } catch (error: any) {
    console.error('\n❌ Backfill failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
