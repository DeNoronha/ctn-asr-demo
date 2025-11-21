/**
 * Cosmos DB Gremlin Client Utility
 * Provides connection and query execution for orchestration graph database
 */

import gremlin from 'gremlin';

const DriverRemoteConnection = (gremlin as any).driver.DriverRemoteConnection;
const Graph = (gremlin as any).structure.Graph;

// Environment variables with validation
const endpoint = process.env.COSMOS_ORCHESTRATION_ENDPOINT;
const primaryKey = process.env.COSMOS_ORCHESTRATION_KEY;
const database = process.env.COSMOS_ORCHESTRATION_DATABASE || 'OrchestrationDB';
const collection = process.env.COSMOS_ORCHESTRATION_GRAPH || 'Orchestrations';

// Validate required credentials at module initialization
if (!endpoint) {
  throw new Error('COSMOS_ORCHESTRATION_ENDPOINT environment variable is required but not set');
}
if (!primaryKey) {
  throw new Error('COSMOS_ORCHESTRATION_KEY environment variable is required but not set');
}
if (!endpoint.startsWith('https://')) {
  throw new Error('COSMOS_ORCHESTRATION_ENDPOINT must start with https://');
}

// Cosmos DB Gremlin endpoint format
const gremlinEndpoint = endpoint.replace('https://', 'wss://').replace(':443/', '') + `:443/gremlin`;

// Authentication
const authenticator = new (gremlin as any).driver.auth.PlainTextSaslAuthenticator(
  `/dbs/${database}/colls/${collection}`,
  primaryKey
);

// Create connection
let connection: any = null;
let graph: any = null;

/**
 * Get or create Gremlin connection
 */
export function getConnection(): any {
  if (!connection) {
    connection = new DriverRemoteConnection(
      gremlinEndpoint,
      {
        authenticator,
        rejectUnauthorized: true,
        mimeType: 'application/vnd.gremlin-v2.0+json'
      }
    );
  }
  return connection;
}

/**
 * Get or create Graph traversal source
 */
export function getGraphTraversalSource() {
  if (!graph) {
    graph = new Graph();
  }
  return graph.traversal().withRemote(getConnection());
}

/**
 * Execute a raw Gremlin query string
 * @deprecated This function is deprecated due to security concerns (Gremlin injection risk).
 * Use the specific helper functions instead (e.g., getOrchestrationDetails, getEventsForOrchestration).
 * @param query Gremlin query string
 * @param bindings Optional parameter bindings
 */
export async function executeQuery(query: string, bindings?: Record<string, any>): Promise<any> {
  throw new Error(
    'executeQuery() is deprecated for security reasons. Use specific helper functions instead.'
  );
}

/**
 * Close the connection (call on shutdown)
 */
export async function closeConnection(): Promise<void> {
  if (connection) {
    await connection.close();
    connection = null;
    graph = null;
  }
}

/**
 * Helper: Create orchestration vertex
 */
export async function createOrchestration(data: {
  id: string;
  partitionKey: string;
  containerId: string;
  bolNumber: string;
  status: string;
  createdBy: string;
  priority?: string;
}): Promise<any> {
  const g = getGraphTraversalSource();

  const result = await g
    .addV('orchestration')
    .property('id', data.id)
    .property('partitionKey', data.partitionKey)
    .property('container_id', data.containerId)
    .property('bol_number', data.bolNumber)
    .property('status', data.status)
    .property('created_at', new Date().toISOString())
    .property('created_by', data.createdBy)
    .property('priority', data.priority || 'MEDIUM')
    .next();

  return result.value;
}

/**
 * Helper: Add party to orchestration
 */
export async function addPartyToOrchestration(
  orchestrationId: string,
  partyId: string,
  role: string,
  involvementType: string = 'PRIMARY'
): Promise<any> {
  const g = getGraphTraversalSource();

  const result = await g
    .V(orchestrationId)
    .addE('involves')
    .to(g.V(partyId))
    .property('role', role)
    .property('involvement_type', involvementType)
    .property('added_at', new Date().toISOString())
    .next();

  return result.value;
}

/**
 * Helper: Get orchestrations for a party
 */
export async function getOrchestrationsForParty(
  partyId: string,
  status?: string[],
  skip: number = 0,
  limit: number = 20
): Promise<any[]> {
  const g = getGraphTraversalSource();

  let query = g.V(partyId).in_('involves').hasLabel('orchestration');

  if (status && status.length > 0) {
    query = query.has('status', gremlin.process.P.within(...status));
  }

  const results = await query
    .order()
    .by('created_at', gremlin.process.order.desc)
    .range(skip, skip + limit)
    .valueMap(true)
    .toList();

  return results;
}

/**
 * Helper: Get orchestration details with parties and events
 */
export async function getOrchestrationDetails(orchestrationId: string): Promise<any> {
  const g = getGraphTraversalSource();

  const result = await g
    .V(orchestrationId)
    .project('orchestration', 'parties', 'events', 'parent', 'children')
    .by(gremlin.process.statics.valueMap(true))
    .by(gremlin.process.statics.out('involves').valueMap(true).fold())
    .by(gremlin.process.statics.in_('occurred_in').order().by('timestamp', gremlin.process.order.desc).limit(10).valueMap(true).fold())
    .by(gremlin.process.statics.in_('parent_of').valueMap('id', 'container_id').fold())
    .by(gremlin.process.statics.out('parent_of').valueMap('id', 'container_id').fold())
    .next();

  return result.value;
}

/**
 * Helper: Get events for orchestration
 */
export async function getEventsForOrchestration(
  orchestrationId: string,
  eventType?: string,
  limit: number = 50
): Promise<any[]> {
  const g = getGraphTraversalSource();

  let query = g.V(orchestrationId).in_('occurred_in').hasLabel('event');

  if (eventType) {
    query = query.has('event_type', eventType);
  }

  const results = await query
    .order()
    .by('timestamp', gremlin.process.order.desc)
    .limit(limit)
    .valueMap(true)
    .toList();

  return results;
}

/**
 * Helper: Check if a party is involved in an orchestration
 * Used for authorization checks to prevent IDOR vulnerabilities
 */
export async function isPartyInvolvedInOrchestration(
  orchestrationId: string,
  partyId: string
): Promise<boolean> {
  const g = getGraphTraversalSource();

  try {
    // Check if there's an edge from orchestration to party with 'involves' label
    const result = await g
      .V(orchestrationId)
      .out('involves')
      .hasId(partyId)
      .count()
      .next();

    return result.value > 0;
  } catch (error) {
    console.error('Error checking party involvement:', error);
    return false;
  }
}
