/**
 * Database Connectivity Test
 * Tests if we can connect to the PostgreSQL database from the API
 */

const { Pool } = require('pg');

async function testDatabaseConnection() {
  console.log('Database Connectivity Test');
  console.log('==========================\n');

  // Create pool with same config as API
  const pool = new Pool({
    host: 'psql-ctn-demo-asr-dev.postgres.database.azure.com',
    port: 5432,
    database: 'asr_dev',
    user: 'asradmin',
    password: process.env.DB_PASSWORD || '',
    ssl: {
      rejectUnauthorized: true,
    },
    max: 5,
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('Attempting to connect...');
    const client = await pool.connect();
    console.log('✅ Connected successfully!\n');

    // Test 1: Simple query
    console.log('Test 1: SELECT 1');
    const result1 = await client.query('SELECT 1 as test');
    console.log('✅ Result:', result1.rows[0]);
    console.log('');

    // Test 2: Check tables exist
    console.log('Test 2: Check if legal_entity_contact table exists');
    const result2 = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'legal_entity_contact'
      ORDER BY ordinal_position
    `);
    console.log(`✅ Table has ${result2.rows.length} columns:`);
    result2.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    console.log('');

    // Test 3: Count contacts
    console.log('Test 3: Count contacts');
    const result3 = await client.query(`
      SELECT COUNT(*) as count
      FROM legal_entity_contact
      WHERE is_deleted = false
    `);
    console.log(`✅ Found ${result3.rows[0].count} active contacts\n`);

    // Test 4: Test actual query from API
    console.log('Test 4: Test GET /contacts/:id query');
    const testContactId = '00000000-0000-0000-0000-000000000000';
    const result4 = await client.query(`
      SELECT contact_id, legal_entity_id, contact_type, contact_name, email,
             phone, job_title, is_primary, dt_created, dt_modified
      FROM legal_entity_contact
      WHERE contact_id = $1 AND is_deleted = false
    `, [testContactId]);

    if (result4.rows.length === 0) {
      console.log(`✅ Query executed successfully (0 results for fake ID, as expected)\n`);
    } else {
      console.log(`✅ Query returned ${result4.rows.length} results\n`);
    }

    client.release();
    console.log('=====================================');
    console.log('✅ ALL TESTS PASSED');
    console.log('Database is accessible and schema is correct');

  } catch (error) {
    console.error('❌ DATABASE ERROR:', error.message);
    console.error('Details:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (!process.env.DB_PASSWORD) {
  console.error('❌ DB_PASSWORD environment variable not set');
  console.error('Usage: DB_PASSWORD=your_password node db-test.js');
  process.exit(1);
}

testDatabaseConnection();
