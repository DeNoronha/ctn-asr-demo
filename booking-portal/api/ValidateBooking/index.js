"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cosmos_1 = require("@azure/cosmos");
const auth_1 = require("../shared/auth");
// Environment variables
const COSMOS_ENDPOINT = process.env.COSMOS_DB_ENDPOINT || process.env.COSMOS_ENDPOINT;
const COSMOS_KEY = process.env.COSMOS_DB_KEY;
const COSMOS_DATABASE_NAME = process.env.COSMOS_DATABASE_NAME || 'ctn-bookings-db';
const COSMOS_CONTAINER_NAME = process.env.COSMOS_CONTAINER_NAME || 'bookings';
const httpTrigger = async function (context, req) {
    context.log('ValidateBooking triggered');
    try {
        // Authenticate user
        const user = await (0, auth_1.getUserFromRequest)(context, req);
        if (!user) {
            context.res = {
                status: 401,
                body: { error: 'Unauthorized', message: 'Valid authentication token required' }
            };
            return;
        }
        context.log(`Authenticated user: ${user.email}`);
        const bookingId = context.bindingData.bookingId;
        const validation = req.body;
        if (!validation || !validation.action) {
            context.res = {
                status: 400,
                body: { error: 'Bad request', message: 'Validation action required' }
            };
            return;
        }
        context.log(`Validating booking ${bookingId} with action: ${validation.action}`);
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
        // Get existing booking using query (to avoid needing partition key upfront)
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
                body: { error: 'Not found', message: `Booking ${bookingId} not found` }
            };
            return;
        }
        const booking = results[0];
        // Create validation record
        const validationRecord = {
            timestamp: new Date().toISOString(),
            action: validation.action,
            validatedBy: user.email,
            validatedByName: user.name,
            validatedByUserId: user.userId,
            corrections: validation.corrections || {},
            notes: validation.notes || '',
            previousStatus: booking.processingStatus
        };
        // Update booking
        booking.validationHistory = booking.validationHistory || [];
        booking.validationHistory.push(validationRecord);
        // Update processing status based on action
        switch (validation.action) {
            case 'approve':
                booking.processingStatus = 'validated';
                break;
            case 'correct':
                booking.processingStatus = 'corrected';
                // Apply corrections to dcsaPlusData
                if (validation.corrections) {
                    booking.dcsaPlusData = {
                        ...booking.dcsaPlusData,
                        ...validation.corrections
                    };
                }
                // Increase confidence for corrected fields
                if (booking.extractionMetadata && validation.corrections) {
                    Object.keys(validation.corrections).forEach(field => {
                        if (booking.extractionMetadata.confidenceScores[field] !== undefined) {
                            booking.extractionMetadata.confidenceScores[field] = 1.0; // Perfect confidence after manual correction
                        }
                    });
                }
                break;
            case 'reject':
                booking.processingStatus = 'rejected';
                break;
        }
        booking.lastModified = new Date().toISOString();
        booking.lastModifiedBy = user.email;
        // Save updated booking (using correct partition key: tenantId)
        await container.item(bookingId, booking.tenantId).replace(booking);
        context.log(`Booking ${bookingId} validated successfully by ${user.email}`);
        context.res = {
            status: 200,
            body: {
                success: true,
                bookingId,
                action: validation.action,
                newStatus: booking.processingStatus,
                message: 'Validation recorded successfully'
            },
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
    catch (error) {
        context.log.error('Error in ValidateBooking:', error);
        context.res = {
            status: 500,
            body: { error: 'Internal server error', message: error.message, details: error.stack },
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
};
exports.default = httpTrigger;
//# sourceMappingURL=index.js.map