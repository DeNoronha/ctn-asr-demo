import { AzureFunction, Context, HttpRequest } from "@azure/functions";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('GetBookings triggered');

    try {
        // Mock data - will be replaced with actual Cosmos DB query
        const mockBookings = {
            data: [
                {
                    id: 'booking-1',
                    documentId: 'doc-1',
                    containerNumber: 'OOLU3703895',
                    carrierBookingReference: 'OOLU2649906690',
                    uploadTimestamp: new Date().toISOString(),
                    processingStatus: 'pending',
                    overallConfidence: 0.87
                },
                {
                    id: 'booking-2',
                    documentId: 'doc-2',
                    containerNumber: 'MAEU1234567',
                    carrierBookingReference: 'MAEU9876543210',
                    uploadTimestamp: new Date(Date.now() - 3600000).toISOString(),
                    processingStatus: 'validated',
                    overallConfidence: 0.95
                }
            ]
        };

        context.res = {
            status: 200,
            body: mockBookings,
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
