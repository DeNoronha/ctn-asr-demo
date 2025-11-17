import { app, HttpResponseInit, InvocationContext } from '@azure/functions';
import { wrapEndpoint, AuthenticatedRequest } from '../middleware/endpointWrapper';
import { Permission } from '../middleware/rbac';
import { getPool } from '../utils/database';
import { handleError } from '../utils/errors';

const pool = getPool();

async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const legalEntityId = request.params.legalentityid;

  if (!legalEntityId) {
    return {
      status: 400,
      jsonBody: { error: 'Legal entity ID is required' },
    };
  }

  try {
    // Retrieve KvK registry data - always return the latest record
    // Historical records are preserved but we show the most recent one
    const result = await pool.query(
      `SELECT
         registry_data_id,
         legal_entity_id,
         kvk_number,
         company_name,
         legal_form,
         trade_names,
         formal_registration_date,
         material_registration_date,
         company_status,
         addresses,
         sbi_activities,
         total_employees,
         kvk_profile_url,
         establishment_profile_url,
         raw_api_response,
         fetched_at,
         last_verified_at,
         data_source
       FROM kvk_registry_data
       WHERE legal_entity_id = $1
       ORDER BY fetched_at DESC
       LIMIT 1`,
      [legalEntityId]
    );

    if (result.rows.length === 0) {
      return {
        status: 404,
        jsonBody: { error: 'No KvK registry data found for this entity' },
      };
    }

    const data = result.rows[0];

    // Parse JSON fields
    if (data.trade_names && typeof data.trade_names === 'string') {
      data.trade_names = JSON.parse(data.trade_names);
    }
    if (data.addresses && typeof data.addresses === 'string') {
      data.addresses = JSON.parse(data.addresses);
    }
    if (data.sbi_activities && typeof data.sbi_activities === 'string') {
      data.sbi_activities = JSON.parse(data.sbi_activities);
    }
    if (data.raw_api_response && typeof data.raw_api_response === 'string') {
      data.raw_api_response = JSON.parse(data.raw_api_response);
    }

    context.log(`Retrieved KvK registry data for entity ${legalEntityId}`);

    return {
      status: 200,
      jsonBody: data,
    };
  } catch (error: any) {
    return handleError(error, context);
  }
}

app.http('getKvkRegistryData', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'v1/legal-entities/{legalentityid}/kvk-registry-data',
  handler: wrapEndpoint(handler, {
    requireAuth: true,
    requiredPermissions: [Permission.READ_OWN_ENTITY, Permission.READ_ALL_ENTITIES],
    requireAllPermissions: false,
  }),
});
