"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const httpTrigger = async function (context, req) {
    context.log('UploadDocument triggered');
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
                    transportMode: 'barge',
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
        context.res = {
            status: 202,
            body: mockBooking,
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
    catch (error) {
        context.log.error('Error in UploadDocument:', error);
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