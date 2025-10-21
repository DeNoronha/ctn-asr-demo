/**
 * Knowledge Base Service
 *
 * Manages few-shot learning examples for Claude extraction
 * Retrieves validated examples from Cosmos DB
 */

import { CosmosClient, Container } from '@azure/cosmos';
import { KnowledgeBaseExample, DocumentType, DocumentData } from './dcsaSchemas';
import { extractSnippet } from './pdfExtractor';

let cosmosClient: CosmosClient | null = null;
let knowledgeBaseContainer: Container | null = null;

/**
 * Initializes Cosmos DB connection for knowledge base
 */
export function initializeKnowledgeBase(
  endpoint: string,
  key: string,
  databaseName: string = 'booking-portal',
  containerName: string = 'knowledge-base'
): void {
  cosmosClient = new CosmosClient({ endpoint, key });
  const database = cosmosClient.database(databaseName);
  knowledgeBaseContainer = database.container(containerName);
}

/**
 * Gets Cosmos DB container (throws if not initialized)
 */
function getContainer(): Container {
  if (!knowledgeBaseContainer) {
    throw new Error('Knowledge base not initialized. Call initializeKnowledgeBase() first.');
  }
  return knowledgeBaseContainer;
}

/**
 * Retrieves few-shot examples from knowledge base
 * Prioritizes: same carrier + doc type > same carrier > same doc type
 */
export async function getFewShotExamples(
  documentType: DocumentType,
  carrier: string,
  limit: number = 5
): Promise<KnowledgeBaseExample[]> {
  const container = getContainer();

  try {
    // Query with priority scoring
    const query = `
      SELECT TOP @limit *
      FROM c
      WHERE c.validated = true
        AND (
          (c.carrier = @carrier AND c.documentType = @documentType) OR
          (c.carrier = @carrier) OR
          (c.documentType = @documentType)
        )
      ORDER BY
        CASE
          WHEN c.carrier = @carrier AND c.documentType = @documentType THEN 1
          WHEN c.carrier = @carrier THEN 2
          WHEN c.documentType = @documentType THEN 3
          ELSE 4
        END,
        c.confidenceScore DESC,
        c.validatedDate DESC
    `;

    const { resources } = await container.items
      .query({
        query,
        parameters: [
          { name: '@limit', value: limit },
          { name: '@carrier', value: carrier.toLowerCase() },
          { name: '@documentType', value: documentType }
        ]
      })
      .fetchAll();

    return resources as KnowledgeBaseExample[];
  } catch (error: any) {
    console.error('Failed to fetch few-shot examples:', error);
    // Return empty array instead of failing - extraction can proceed without examples
    return [];
  }
}

/**
 * Adds validated extraction to knowledge base
 */
export async function addToKnowledgeBase(
  documentType: DocumentType,
  carrier: string,
  documentText: string,
  extractedData: DocumentData,
  validatedBy: string,
  confidenceScore: number
): Promise<KnowledgeBaseExample> {
  const container = getContainer();

  const example: KnowledgeBaseExample = {
    id: `kb-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    documentType,
    carrier: carrier.toLowerCase(),
    documentSnippet: extractSnippet(documentText, 2000),
    extractedData,
    validated: true,
    validatedBy,
    validatedDate: new Date().toISOString(),
    usageCount: 0,
    confidenceScore
  };

  try {
    const { resource } = await container.items.create(example);
    return resource as KnowledgeBaseExample;
  } catch (error: any) {
    throw new Error(`Failed to add example to knowledge base: ${error.message}`);
  }
}

/**
 * Increments usage count for an example
 */
export async function incrementUsageCount(exampleId: string): Promise<void> {
  const container = getContainer();

  try {
    const { resource: example } = await container.item(exampleId, exampleId).read();
    if (!example) return;

    example.usageCount = (example.usageCount || 0) + 1;
    await container.item(exampleId, exampleId).replace(example);
  } catch (error: any) {
    console.error('Failed to increment usage count:', error);
    // Non-critical error, don't throw
  }
}

/**
 * Gets knowledge base statistics
 */
export async function getKnowledgeBaseStats(): Promise<{
  totalExamples: number;
  byDocumentType: Record<DocumentType, number>;
  byCarrier: Record<string, number>;
  averageConfidence: number;
}> {
  const container = getContainer();

  try {
    const query = `
      SELECT
        COUNT(1) as totalCount,
        c.documentType,
        c.carrier,
        AVG(c.confidenceScore) as avgConfidence
      FROM c
      WHERE c.validated = true
      GROUP BY c.documentType, c.carrier
    `;

    const { resources } = await container.items.query(query).fetchAll();

    const stats = {
      totalExamples: 0,
      byDocumentType: {} as Record<DocumentType, number>,
      byCarrier: {} as Record<string, number>,
      averageConfidence: 0
    };

    let totalConfidence = 0;

    for (const item of resources) {
      stats.totalExamples += item.totalCount;
      stats.byDocumentType[item.documentType] = (stats.byDocumentType[item.documentType] || 0) + item.totalCount;
      stats.byCarrier[item.carrier] = (stats.byCarrier[item.carrier] || 0) + item.totalCount;
      totalConfidence += item.avgConfidence * item.totalCount;
    }

    stats.averageConfidence = stats.totalExamples > 0 ? totalConfidence / stats.totalExamples : 0;

    return stats;
  } catch (error: any) {
    throw new Error(`Failed to get knowledge base stats: ${error.message}`);
  }
}

/**
 * Removes low-quality examples from knowledge base
 */
export async function pruneKnowledgeBase(
  minConfidenceScore: number = 0.7,
  maxAge: number = 90  // days
): Promise<number> {
  const container = getContainer();

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);

    const query = `
      SELECT c.id
      FROM c
      WHERE c.confidenceScore < @minConfidence
        OR c.validatedDate < @cutoffDate
        OR c.validated = false
    `;

    const { resources } = await container.items
      .query({
        query,
        parameters: [
          { name: '@minConfidence', value: minConfidenceScore },
          { name: '@cutoffDate', value: cutoffDate.toISOString() }
        ]
      })
      .fetchAll();

    let deletedCount = 0;

    for (const item of resources) {
      try {
        await container.item(item.id, item.id).delete();
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete example ${item.id}:`, error);
      }
    }

    return deletedCount;
  } catch (error: any) {
    throw new Error(`Failed to prune knowledge base: ${error.message}`);
  }
}

/**
 * Finds similar examples based on text similarity
 * Simple keyword-based similarity for now (can be enhanced with embeddings later)
 */
export async function findSimilarExamples(
  documentText: string,
  documentType: DocumentType,
  limit: number = 3
): Promise<KnowledgeBaseExample[]> {
  const container = getContainer();

  try {
    // Extract key terms from document
    const keyTerms = extractKeyTerms(documentText);

    if (keyTerms.length === 0) {
      return [];
    }

    // Query for examples containing similar terms
    const query = `
      SELECT TOP @limit *
      FROM c
      WHERE c.validated = true
        AND c.documentType = @documentType
        AND (${keyTerms.map((_, idx) => `CONTAINS(c.documentSnippet, @term${idx})`).join(' OR ')})
      ORDER BY c.confidenceScore DESC
    `;

    const parameters = [
      { name: '@limit', value: limit },
      { name: '@documentType', value: documentType },
      ...keyTerms.map((term, idx) => ({ name: `@term${idx}`, value: term }))
    ];

    const { resources } = await container.items
      .query({ query, parameters })
      .fetchAll();

    return resources as KnowledgeBaseExample[];
  } catch (error: any) {
    console.error('Failed to find similar examples:', error);
    return [];
  }
}

/**
 * Extracts key terms from document text for similarity matching
 */
function extractKeyTerms(text: string, maxTerms: number = 5): string[] {
  // Normalize text
  const normalized = text.toLowerCase();

  // Common shipping terms to look for
  const importantTerms = [
    'booking', 'container', 'vessel', 'port', 'cargo',
    'shipper', 'consignee', 'delivery', 'loading', 'discharge'
  ];

  const foundTerms: string[] = [];

  for (const term of importantTerms) {
    if (normalized.includes(term) && foundTerms.length < maxTerms) {
      foundTerms.push(term);
    }
  }

  return foundTerms;
}

/**
 * Validates that a document is suitable for knowledge base
 */
export function shouldAddToKnowledgeBase(
  confidenceScore: number,
  validationErrors: string[]
): boolean {
  // Only add high-quality examples
  const MIN_CONFIDENCE = 0.85;
  const MAX_ERRORS = 0;

  return confidenceScore >= MIN_CONFIDENCE && validationErrors.length <= MAX_ERRORS;
}

/**
 * Gets examples by carrier and document type
 */
export async function getExamplesByCarrierAndType(
  carrier: string,
  documentType: DocumentType
): Promise<KnowledgeBaseExample[]> {
  const container = getContainer();

  try {
    const query = `
      SELECT *
      FROM c
      WHERE c.carrier = @carrier
        AND c.documentType = @documentType
        AND c.validated = true
      ORDER BY c.confidenceScore DESC
    `;

    const { resources } = await container.items
      .query({
        query,
        parameters: [
          { name: '@carrier', value: carrier.toLowerCase() },
          { name: '@documentType', value: documentType }
        ]
      })
      .fetchAll();

    return resources as KnowledgeBaseExample[];
  } catch (error: any) {
    console.error('Failed to get examples by carrier and type:', error);
    return [];
  }
}

/**
 * Checks if knowledge base has sufficient examples for a carrier/type combination
 */
export async function hasSufficientExamples(
  carrier: string,
  documentType: DocumentType,
  minExamples: number = 3
): Promise<boolean> {
  const examples = await getExamplesByCarrierAndType(carrier, documentType);
  return examples.length >= minExamples;
}

/**
 * Exports knowledge base for backup
 */
export async function exportKnowledgeBase(): Promise<KnowledgeBaseExample[]> {
  const container = getContainer();

  try {
    const query = 'SELECT * FROM c WHERE c.validated = true';
    const { resources } = await container.items.query(query).fetchAll();
    return resources as KnowledgeBaseExample[];
  } catch (error: any) {
    throw new Error(`Failed to export knowledge base: ${error.message}`);
  }
}

/**
 * Imports examples into knowledge base
 */
export async function importKnowledgeBase(examples: KnowledgeBaseExample[]): Promise<number> {
  const container = getContainer();
  let importedCount = 0;

  for (const example of examples) {
    try {
      await container.items.create(example);
      importedCount++;
    } catch (error: any) {
      console.error(`Failed to import example ${example.id}:`, error);
    }
  }

  return importedCount;
}
