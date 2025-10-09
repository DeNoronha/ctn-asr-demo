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

export async function UpdateLegalEntity(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const legalEntityId = request.params.legalEntityId;
  
  if (!legalEntityId) {
    return {
      status: 400,
      body: JSON.stringify({ error: 'legal_entity_id parameter is required' })
    };
  }

  try {
    const body = await request.json() as any;
    
    const result = await pool.query(
      `UPDATE legal_entity 
       SET primary_legal_name = COALESCE($1, primary_legal_name),
           address_line1 = COALESCE($2, address_line1),
           address_line2 = COALESCE($3, address_line2),
           postal_code = COALESCE($4, postal_code),
           city = COALESCE($5, city),
           province = COALESCE($6, province),
           country_code = COALESCE($7, country_code),
           entity_legal_form = COALESCE($8, entity_legal_form),
           registered_at = COALESCE($9, registered_at),
           dt_modified = CURRENT_TIMESTAMP,
           modified_by = $10
       WHERE legal_entity_id = $11
       RETURNING *`,
      [
        body.primary_legal_name,
        body.address_line1,
        body.address_line2,
        body.postal_code,
        body.city,
        body.province,
        body.country_code,
        body.entity_legal_form,
        body.registered_at,
        body.modified_by || 'system',
        legalEntityId
      ]
    );

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
    context.error('Error updating legal entity:', error);
    return {
      status: 500,
      body: JSON.stringify({ error: 'Failed to update legal entity' })
    };
  }
}

app.http('UpdateLegalEntity', {
  methods: ['PUT'],
  route: 'v1/legal-entities/{legalEntityId}',
  authLevel: 'anonymous',
  handler: UpdateLegalEntity
});
