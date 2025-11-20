/**
 * Check legal_entity_contact table schema
 * Usage: DB_PASSWORD=your_password node check-contacts-schema.js
 */

const { Client } = require('pg');

async function checkSchema() {
  const client = new Client({
    host: 'psql-ctn-demo-asr-dev.postgres.database.azure.com',
    port: 5432,
    database: 'asr_dev',
    user: 'asradmin',
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: true }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get table structure
    console.log('========================================');
    console.log('legal_entity_contact Table Structure');
    console.log('========================================\n');

    const result = await client.query(`
      SELECT
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'legal_entity_contact'
      ORDER BY ordinal_position
    `);

    console.log('Columns:');
    result.rows.forEach((row, idx) => {
      console.log(`  ${idx + 1}. ${row.column_name.padEnd(25)} ${row.data_type.padEnd(20)} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Get primary key
    console.log('\n========================================');
    console.log('Primary Key');
    console.log('========================================\n');

    const pkResult = await client.query(`
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = 'legal_entity_contact'::regclass
      AND i.indisprimary
    `);

    pkResult.rows.forEach(row => {
      console.log(`  Primary Key: ${row.attname}`);
    });

    // Check what code is using
    console.log('\n========================================');
    console.log('API Route Analysis');
    console.log('========================================\n');
    console.log('Looking for column references in routes.ts...\n');

    const fs = require('fs');
    const routesContent = fs.readFileSync('../../../api/src/routes.ts', 'utf8');

    // Find contact-related queries
    const contactIdMatches = routesContent.match(/contact_id|contactId/g);
    if (contactIdMatches) {
      console.log(`Found ${contactIdMatches.length} references to contact_id/contactId in routes.ts`);
    }

    // Check for specific column name in SELECT
    const selectMatch = routesContent.match(/SELECT[^;]+FROM legal_entity_contact/gi);
    if (selectMatch && selectMatch.length > 0) {
      console.log('\nFirst SELECT query found:');
      console.log(selectMatch[0].substring(0, 200) + '...');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (!process.env.DB_PASSWORD) {
  console.error('❌ Please set DB_PASSWORD environment variable');
  console.error('Usage: DB_PASSWORD=your_password node check-contacts-schema.js');
  process.exit(1);
}

checkSchema();
