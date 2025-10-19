import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export async function GetBookings(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`GetBookings triggered`);

    try {
        // Mock data for MVP - will be replaced with Cosmos DB query
        const mockBookings = [
            {
                id: 'booking-1',
                tenantId: 'demo-terminal',
                documentId: 'doc-1',
                documentUrl: 'https://example.com/doc1.pdf',
                uploadedBy: 'user1@demo.com',
                uploadTimestamp: new Date().toISOString(),
                processingStatus: 'pending',
                overallConfidence: 0.87,
                dcsaPlusData: {
                    carrierBookingReference: 'DEMO123456',
                    shipmentDetails: {
                        carrierCode: 'DEMO',
                        vesselName: 'DEMO VESSEL',
                        voyageNumber: '001',
                        portOfLoading: { UNLocationCode: 'NLRTM', locationName: 'Rotterdam' },
                        portOfDischarge: { UNLocationCode: 'DEHAM', locationName: 'Hamburg' }
                    },
                    containers: [],
                    inlandExtensions: {
                        transportMode: 'barge',
                        pickupDetails: { facilityName: 'Demo Terminal' },
                        deliveryDetails: { facilityName: 'Demo Destination' }
                    },
                    parties: {}
                },
                extractionMetadata: {
                    modelId: 'prebuilt-invoice',
                    modelVersion: '1.0',
                    confidenceScores: {},
                    uncertainFields: [],
                    processingTimeMs: 2500,
                    extractionTimestamp: new Date().toISOString()
                },
                validationHistory: []
            }
        ];

        return {
            status: 200,
            jsonBody: {
                data: mockBookings,
                pagination: {
                    total: 1,
                    skip: 0,
                    limit: 20
                }
            }
        };

    } catch (error: any) {
        context.error('Error in GetBookings:', error);
        return {
            status: 500,
            jsonBody: { error: 'Internal server error', message: error.message }
        };
    }
}

app.http('GetBookings', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'v1/bookings',
    handler: GetBookings
});
