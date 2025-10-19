import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export async function UploadDocument(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`UploadDocument triggered`);

    try {
        // Mock response for MVP - will be replaced with actual upload and processing
        const mockBooking = {
            id: `booking-${Date.now()}`,
            tenantId: 'demo-terminal',
            documentId: `doc-${Date.now()}`,
            documentUrl: 'https://example.com/uploaded.pdf',
            uploadedBy: 'user@demo.com',
            uploadTimestamp: new Date().toISOString(),
            processingStatus: 'processing',
            overallConfidence: 0,
            dcsaPlusData: {
                carrierBookingReference: '',
                shipmentDetails: {
                    carrierCode: '',
                    portOfLoading: { UNLocationCode: '', locationName: '' },
                    portOfDischarge: { UNLocationCode: '', locationName: '' }
                },
                containers: [],
                inlandExtensions: {
                    transportMode: 'barge' as const,
                    pickupDetails: { facilityName: '' },
                    deliveryDetails: { facilityName: '' }
                },
                parties: {}
            },
            extractionMetadata: {
                modelId: 'prebuilt-invoice',
                modelVersion: '1.0',
                confidenceScores: {},
                uncertainFields: [],
                processingTimeMs: 0,
                extractionTimestamp: new Date().toISOString()
            },
            validationHistory: []
        };

        return {
            status: 202,
            jsonBody: mockBooking
        };

    } catch (error: any) {
        context.error('Error in UploadDocument:', error);
        return {
            status: 500,
            jsonBody: { error: 'Internal server error', message: error.message }
        };
    }
}

app.http('UploadDocument', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'v1/documents',
    handler: UploadDocument
});
