"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cosmos_1 = require("@azure/cosmos");
// Environment variables
const COSMOS_ENDPOINT = process.env.COSMOS_DB_ENDPOINT || process.env.COSMOS_ENDPOINT;
const COSMOS_KEY = process.env.COSMOS_DB_KEY;
const COSMOS_DATABASE_NAME = process.env.COSMOS_DATABASE_NAME || 'ctn-bookings-db';
const COSMOS_CONTAINER_NAME = process.env.COSMOS_CONTAINER_NAME || 'bookings';
const httpTrigger = async function (context, req) {
    context.log('GetBookings triggered');
    try {
        // Validate environment variables
        if (!COSMOS_ENDPOINT || !COSMOS_KEY) {
            throw new Error('Cosmos DB credentials not configured');
        }
        const cosmosClient = new cosmos_1.CosmosClient({
            endpoint: COSMOS_ENDPOINT,
            key: COSMOS_KEY
        });
        const database = cosmosClient.database(COSMOS_DATABASE_NAME);
        const container = database.container(COSMOS_CONTAINER_NAME);
        // Check if bookingId parameter is provided
        // Note: Azure Functions lowercases route parameters
        const bookingId = context.bindingData.bookingid;
        if (bookingId) {
            // Fetch single booking by ID
            context.log(`Fetching booking: ${bookingId}`);
            try {
                const { resource: booking } = await container.item(bookingId, bookingId).read();
                if (!booking) {
                    context.res = {
                        status: 404,
                        body: { error: 'Booking not found' },
                        headers: { 'Content-Type': 'application/json' }
                    };
                    return;
                }
                context.log(`Retrieved booking ${bookingId} from Cosmos DB`);
                context.res = {
                    status: 200,
                    body: booking,
                    headers: { 'Content-Type': 'application/json' }
                };
            }
            catch (error) {
                if (error.code === 404) {
                    context.res = {
                        status: 404,
                        body: { error: 'Booking not found' },
                        headers: { 'Content-Type': 'application/json' }
                    };
                }
                else {
                    throw error;
                }
            }
        }
        else {
            // Query all bookings, ordered by upload timestamp descending
            const querySpec = {
                query: "SELECT c.id, c.documentId, c.uploadTimestamp, c.processingStatus, c.overallConfidence, c.dcsaPlusData FROM c ORDER BY c.uploadTimestamp DESC"
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
        }
    }
    catch (error) {
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
exports.default = httpTrigger;
//# sourceMappingURL=index.js.map