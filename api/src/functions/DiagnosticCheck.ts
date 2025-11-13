import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getPool } from '../utils/database';
import { handleError } from '../utils/errors';

export async function diagnosticCheck(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const pool = getPool();
  const legalEntityId = request.query.get('legal_entity_id');

  try {
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      database_connection: 'unknown',
      legal_entities: [],
      identifiers: [],
      test_entity: null,
      email_config: {
        email_sender_address: process.env.EMAIL_SENDER_ADDRESS || '(not set)',
        email_sender_address_length: (process.env.EMAIL_SENDER_ADDRESS || '').length,
        communication_services_configured: !!process.env.COMMUNICATION_SERVICES_CONNECTION_STRING,
        event_grid_endpoint: process.env.EVENT_GRID_ENDPOINT || '(not set)',
        event_grid_configured: !!process.env.EVENT_GRID_ACCESS_KEY
      }
    };

    // Test database connection
    try {
      const testQuery = await pool.query('SELECT NOW() as current_time');
      diagnostics.database_connection = 'success';
      diagnostics.database_time = testQuery.rows[0].current_time;
    } catch (error: any) {
      diagnostics.database_connection = 'failed';
      diagnostics.database_error = error.message;
      return {
        status: 500,
        jsonBody: diagnostics
      };
    }

    // Get all legal entities
    try {
      const entitiesResult = await pool.query(
        `SELECT legal_entity_id, primary_legal_name, status
         FROM legal_entity
         WHERE is_deleted = false OR is_deleted IS NULL
         LIMIT 10`
      );
      diagnostics.legal_entities = entitiesResult.rows;
    } catch (error: any) {
      diagnostics.legal_entities_error = error.message;
    }

    // Get all identifiers
    try {
      const identifiersResult = await pool.query(
        `SELECT legal_entity_reference_id, legal_entity_id, identifier_type, identifier_value
         FROM legal_entity_number
         WHERE is_deleted = false OR is_deleted IS NULL
         LIMIT 10`
      );
      diagnostics.identifiers = identifiersResult.rows;
    } catch (error: any) {
      diagnostics.identifiers_error = error.message;
    }

    // If a specific legal_entity_id is provided, check if it exists
    if (legalEntityId) {
      try {
        const entityCheck = await pool.query(
          `SELECT legal_entity_id, primary_legal_name, status
           FROM legal_entity
           WHERE legal_entity_id = $1`,
          [legalEntityId]
        );
        diagnostics.test_entity = entityCheck.rows.length > 0 ? entityCheck.rows[0] : 'NOT_FOUND';
      } catch (error: any) {
        diagnostics.test_entity_error = error.message;
      }

      // Check if entity has any existing identifiers
      if (diagnostics.test_entity && diagnostics.test_entity !== 'NOT_FOUND') {
        try {
          const existingIdentifiers = await pool.query(
            `SELECT identifier_type, identifier_value
             FROM legal_entity_number
             WHERE legal_entity_id = $1
             AND (is_deleted = false OR is_deleted IS NULL)`,
            [legalEntityId]
          );
          diagnostics.test_entity_identifiers = existingIdentifiers.rows;
        } catch (error: any) {
          diagnostics.test_entity_identifiers_error = error.message;
        }
      }
    }

    return {
      status: 200,
      jsonBody: diagnostics
    };
  } catch (error: any) {
    context.error('Diagnostic check failed:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Diagnostic check failed',
        message: error.message,
        code: error.code
      }
    };
  }
}

app.http('DiagnosticCheck', {
  methods: ['GET'],
  route: 'diagnostic/check',
  authLevel: 'anonymous',
  handler: diagnosticCheck
});
