"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cosmos_1 = require("@azure/cosmos");
// Environment variables
const COSMOS_ENDPOINT = process.env.COSMOS_DB_ENDPOINT || process.env.COSMOS_ENDPOINT;
const COSMOS_KEY = process.env.COSMOS_DB_KEY;
const COSMOS_DATABASE_NAME = process.env.COSMOS_DATABASE_NAME || 'booking-portal';
const COSMOS_CONTAINER_NAME = process.env.COSMOS_CONTAINER_NAME || 'bookings';
const httpTrigger = async function (context, req) {
    context.log('GetBookingById triggered');
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
        // Get bookingId from route parameter (lowercased by Azure Functions)
        const bookingId = context.bindingData.bookingid;
        if (!bookingId) {
            context.res = {
                status: 400,
                body: { error: 'Booking ID is required' },
                headers: { 'Content-Type': 'application/json' }
            };
            return;
        }
        context.log(`Fetching booking: ${bookingId}`);
        // Query for the booking (cross-partition query since we don't have tenantId upfront)
        const querySpec = {
            query: "SELECT * FROM c WHERE c.id = @bookingId",
            parameters: [{ name: "@bookingId", value: bookingId }]
        };
        const { resources: results } = await container.items
            .query(querySpec)
            .fetchAll();
        if (results.length === 0) {
            context.res = {
                status: 404,
                body: { error: 'Booking not found' },
                headers: { 'Content-Type': 'application/json' }
            };
            return;
        }
        const booking = results[0];
        context.log(`Retrieved booking ${bookingId} from Cosmos DB`);
        context.res = {
            status: 200,
            body: booking,
            headers: { 'Content-Type': 'application/json' }
        };
    }
    catch (error) {
        context.log.error('Error in GetBookingById:', error);
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