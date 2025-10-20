"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const httpTrigger = async function (context, req) {
    context.log('ValidateBooking triggered');
    try {
        const bookingId = context.bindingData.bookingId;
        const validation = req.body;
        context.log(`Validating booking ${bookingId} with action: ${validation?.action}`);
        // Mock response - will be replaced with actual Cosmos DB update
        context.res = {
            status: 200,
            body: {
                success: true,
                bookingId,
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
            body: { error: 'Internal server error', message: error.message },
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
};
exports.default = httpTrigger;
//# sourceMappingURL=index.js.map