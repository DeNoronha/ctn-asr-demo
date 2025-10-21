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

        // Get status filter from query parameters
        const statusFilter = req.query.status;
        context.log(`Status filter: ${statusFilter || 'none (all bookings)'}`);

        // Build query with optional status filter
        let query = "SELECT c.id, c.documentId, c.uploadTimestamp, c.processingStatus, c.overallConfidence, c.dcsaPlusData FROM c";
        const parameters: any[] = [];

        if (statusFilter) {
            query += " WHERE c.processingStatus = @status";
            parameters.push({ name: "@status", value: statusFilter });
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
            containerNumber: booking.dcsaPlusData?.containers?.[0]?.containerNumber || '',
            carrierBookingReference: booking.dcsaPlusData?.carrierBookingReference || '',
            uploadTimestamp: booking.uploadTimestamp,
            processingStatus: booking.processingStatus,
            overallConfidence: booking.overallConfidence
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
