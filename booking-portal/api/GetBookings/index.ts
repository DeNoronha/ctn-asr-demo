import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";

// Environment variables
const COSMOS_ENDPOINT = process.env.COSMOS_DB_ENDPOINT || process.env.COSMOS_ENDPOINT;
const COSMOS_KEY = process.env.COSMOS_DB_KEY;
const COSMOS_DATABASE_NAME = process.env.COSMOS_DATABASE_NAME || 'booking-portal';
const COSMOS_CONTAINER_NAME = process.env.COSMOS_CONTAINER_NAME || 'bookings';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('GetBookings triggered');

    try {
        // Validate environment variables
        if (!COSMOS_ENDPOINT || !COSMOS_KEY) {
            throw new Error('Cosmos DB credentials not configured');
        }

        const cosmosClient = new CosmosClient({
            endpoint: COSMOS_ENDPOINT,
            key: COSMOS_KEY
        });

        const database = cosmosClient.database(COSMOS_DATABASE_NAME);
        const container = database.container(COSMOS_CONTAINER_NAME);

        // Get filters from query parameters
        const statusFilter = req.query.status;
        const documentTypeFilter = req.query.documentType;
        const carrierFilter = req.query.carrier;

        context.log(`Filters - Status: ${statusFilter || 'all'}, DocumentType: ${documentTypeFilter || 'all'}, Carrier: ${carrierFilter || 'all'}`);

        // Build query with optional filters
        let query = "SELECT c.id, c.documentId, c.documentType, c.documentNumber, c.carrier, c.uploadTimestamp, c.processingStatus, c.extractionMetadata, c.data FROM c";
        const parameters: any[] = [];
        const conditions: string[] = [];

        if (statusFilter) {
            conditions.push("c.processingStatus = @status");
            parameters.push({ name: "@status", value: statusFilter });
        }

        if (documentTypeFilter) {
            conditions.push("c.documentType = @documentType");
            parameters.push({ name: "@documentType", value: documentTypeFilter });
        }

        if (carrierFilter) {
            conditions.push("c.carrier = @carrier");
            parameters.push({ name: "@carrier", value: carrierFilter.toLowerCase() });
        }

        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
        }

        query += " ORDER BY c.uploadTimestamp DESC";

        const querySpec = {
            query,
            parameters
        };

        const { resources: bookings } = await container.items
            .query(querySpec)
            .fetchAll();

        context.log(`Retrieved ${bookings.length} bookings from Cosmos DB`);

        // Format response to match expected structure
        const formattedBookings = bookings.map(booking => ({
            id: booking.id,
            documentId: booking.documentId,
            documentType: booking.documentType,
            documentNumber: booking.documentNumber,
            carrier: booking.carrier,
            containerNumber: booking.data?.containers?.[0]?.containerNumber ||
                           booking.dcsaPlusData?.containers?.[0]?.containerNumber || '',
            carrierBookingReference: booking.documentNumber ||
                                   booking.dcsaPlusData?.carrierBookingReference || '',
            uploadTimestamp: booking.uploadTimestamp,
            processingStatus: booking.processingStatus,
            confidenceScore: booking.extractionMetadata?.confidenceScore || booking.overallConfidence,
            uncertainFields: booking.extractionMetadata?.uncertainFields || []
        }));

        context.res = {
            status: 200,
            body: {
                data: formattedBookings
            },
            headers: {
                'Content-Type': 'application/json'
            }
        };

    } catch (error: any) {
        context.log.error('Error in GetBookings:', error);
        context.res = {
            status: 500,
            body: { error: 'Internal server error', message: error.message },
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
};

export default httpTrigger;
