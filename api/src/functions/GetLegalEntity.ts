import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

export async function GetLegalEntity(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const legalEntityId = request.params.legalEntityId;
  
  if (!legalEntityId) {
    return {
      status: 400,
      body: JSON.stringify({ error: 'legal_entity_id parameter is required' })
    };
  }

  try {
    // Check if legalEntityId is a UUID or an org_id
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(legalEntityId);
    
    let query;
    if (isUUID) {
      // Query by UUID
      query = `SELECT legal_entity_id, party_id, dt_created, dt_modified, created_by, modified_by, 
                      is_deleted, primary_legal_name, address_line1, address_line2, postal_code, 
                      city, province, country_code, entity_legal_form, registered_at,
                      direct_parent_legal_entity_id, ultimate_parent_legal_entity_id
               FROM legal_entity 
               WHERE legal_entity_id = $1 AND (is_deleted IS NULL OR is_deleted = FALSE)`;
    } else {
      // Query by org_id - assume it's the legal_entity_id UUID as string
      query = `SELECT legal_entity_id, party_id, dt_created, dt_modified, created_by, modified_by, 
                      is_deleted, primary_legal_name, address_line1, address_line2, postal_code, 
                      city, province, country_code, entity_legal_form, registered_at,
                      direct_parent_legal_entity_id, ultimate_parent_legal_entity_id
               FROM legal_entity 
               WHERE legal_entity_id::text = $1 AND (is_deleted IS NULL OR is_deleted = FALSE)`;
    }
    
    const result = await pool.query(query, [legalEntityId]);

    if (result.rows.length === 0) {
      return {
        status: 404,
        body: JSON.stringify({ error: 'Legal entity not found' })
      };
    }

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.rows[0])
    };
  } catch (error) {
    context.error('Error fetching legal entity:', error);
    return {
      status: 500,
      body: JSON.stringify({ error: 'Failed to fetch legal entity' })
    };
  }
}

app.http('GetLegalEntity', {
  methods: ['GET'],
  route: 'v1/legal-entities/{legalEntityId}',
  authLevel: 'anonymous',
  handler: GetLegalEntity
});
