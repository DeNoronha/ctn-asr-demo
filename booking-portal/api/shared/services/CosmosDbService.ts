/**
 * CosmosDbService - Handle Azure Cosmos DB operations
 *
 * Responsibilities:
 * - CRUD operations for document records
 * - Query documents with filters
 * - Manage database and container connections
 */

import { CosmosClient, Container, Database, FeedResponse, SqlQuerySpec } from "@azure/cosmos";
import { DocumentRecord } from "../dcsaSchemas";

export interface QueryOptions {
    tenantId?: string;
    status?: string;
    documentType?: string;
    carrier?: string;
    limit?: number;
    continuationToken?: string;
}

export interface QueryResult<T> {
    items: T[];
    continuationToken?: string;
    hasMore: boolean;
}

export class CosmosDbService {
    private container: Container;
    private database: Database;

    constructor(
        endpoint: string,
        key: string,
        databaseName: string,
        containerName: string
    ) {
        if (!endpoint || !key) {
            throw new Error('Cosmos DB endpoint and key are required');
        }

        const cosmosClient = new CosmosClient({ endpoint, key });
        this.database = cosmosClient.database(databaseName);
        this.container = this.database.container(containerName);
    }

    /**
     * Create a new document record
     *
     * @param document - Document record to create
     * @returns Created document with metadata
     */
    async createDocument(document: DocumentRecord): Promise<DocumentRecord> {
        const { resource } = await this.container.items.create(document);
        return resource as DocumentRecord;
    }

    /**
     * Get a document by ID
     *
     * @param id - Document ID
     * @param partitionKey - Partition key (tenantId)
     * @returns Document record or null if not found
     */
    async getDocumentById(id: string, partitionKey: string): Promise<DocumentRecord | null> {
        try {
            const { resource } = await this.container.item(id, partitionKey).read<DocumentRecord>();
            return resource || null;
        } catch (error: any) {
            if (error.code === 404) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Update a document
     *
     * @param id - Document ID
     * @param partitionKey - Partition key (tenantId)
     * @param updates - Partial document updates
     * @returns Updated document
     */
    async updateDocument(
        id: string,
        partitionKey: string,
        updates: Partial<DocumentRecord>
    ): Promise<DocumentRecord> {
        const existing = await this.getDocumentById(id, partitionKey);
        if (!existing) {
            throw new Error(`Document ${id} not found`);
        }

        const updated = { ...existing, ...updates };
        const { resource } = await this.container.item(id, partitionKey).replace(updated);
        return resource as DocumentRecord;
    }

    /**
     * Delete a document
     *
     * @param id - Document ID
     * @param partitionKey - Partition key (tenantId)
     */
    async deleteDocument(id: string, partitionKey: string): Promise<void> {
        await this.container.item(id, partitionKey).delete();
    }

    /**
     * Query documents with filters and pagination
     *
     * @param options - Query options (filters, pagination)
     * @returns Query result with items and pagination token
     */
    async queryDocuments(options: QueryOptions = {}): Promise<QueryResult<DocumentRecord>> {
        const { tenantId, status, documentType, carrier, limit = 50, continuationToken } = options;

        // Build query
        const conditions: string[] = [];
        const parameters: Array<{ name: string; value: any }> = [];

        // CRITICAL: Always filter by tenantId for security and performance
        if (tenantId) {
            conditions.push("c.tenantId = @tenantId");
            parameters.push({ name: "@tenantId", value: tenantId });
        }

        if (status) {
            conditions.push("c.processingStatus = @status");
            parameters.push({ name: "@status", value: status });
        }

        if (documentType) {
            conditions.push("c.documentType = @documentType");
            parameters.push({ name: "@documentType", value: documentType });
        }

        if (carrier) {
            conditions.push("c.carrier = @carrier");
            parameters.push({ name: "@carrier", value: carrier.toLowerCase() });
        }

        let query = "SELECT * FROM c";
        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
        }
        query += " ORDER BY c.uploadTimestamp DESC";

        const querySpec: SqlQuerySpec = { query, parameters };

        // Execute query with pagination
        const queryIterator = this.container.items.query<DocumentRecord>(querySpec, {
            maxItemCount: limit,
            continuationToken: continuationToken
        });

        const response: FeedResponse<DocumentRecord> = await queryIterator.fetchNext();

        return {
            items: response.resources,
            continuationToken: response.continuationToken,
            hasMore: !!response.continuationToken
        };
    }

    /**
     * Get all documents (use with caution - prefer queryDocuments with pagination)
     *
     * @param querySpec - SQL query specification
     * @returns Array of documents
     */
    async getAllDocuments(querySpec: SqlQuerySpec): Promise<DocumentRecord[]> {
        const { resources } = await this.container.items.query<DocumentRecord>(querySpec).fetchAll();
        return resources;
    }
}
