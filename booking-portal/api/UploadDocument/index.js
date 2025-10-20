"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storage_blob_1 = require("@azure/storage-blob");
const ai_form_recognizer_1 = require("@azure/ai-form-recognizer");
const cosmos_1 = require("@azure/cosmos");
const identity_1 = require("@azure/identity");
const auth_1 = require("../shared/auth");
// Environment variables
const FORM_RECOGNIZER_ENDPOINT = process.env.DOCUMENT_INTELLIGENCE_ENDPOINT || process.env.FORM_RECOGNIZER_ENDPOINT;
const FORM_RECOGNIZER_KEY = process.env.DOCUMENT_INTELLIGENCE_KEY;
const COSMOS_ENDPOINT = process.env.COSMOS_DB_ENDPOINT || process.env.COSMOS_ENDPOINT;
const COSMOS_KEY = process.env.COSMOS_DB_KEY;
const STORAGE_ACCOUNT_NAME = process.env.STORAGE_ACCOUNT_NAME;
const COSMOS_DATABASE_NAME = process.env.COSMOS_DATABASE_NAME || 'booking-portal';
const COSMOS_CONTAINER_NAME = process.env.COSMOS_CONTAINER_NAME || 'bookings';
const STORAGE_CONTAINER_NAME = process.env.STORAGE_CONTAINER_NAME || 'documents';
const httpTrigger = async function (context, req) {
    context.log('UploadDocument triggered');
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
        context.log(`Authenticated user: ${user.email} (${user.name})`);
        // Validate environment variables
        if (!FORM_RECOGNIZER_ENDPOINT || !FORM_RECOGNIZER_KEY) {
            throw new Error('Form Recognizer credentials not configured');
        }
        if (!COSMOS_ENDPOINT || !COSMOS_KEY) {
            throw new Error('Cosmos DB credentials not configured');
        }
        if (!STORAGE_ACCOUNT_NAME) {
            throw new Error('Storage Account not configured');
        }
        // Extract file from multipart form data
        const file = req.body;
        if (!file || !Buffer.isBuffer(file)) {
            context.res = {
                status: 400,
                body: { error: 'No file provided or invalid file format' }
            };
            return;
        }
        const bookingId = `booking-${Date.now()}`;
        const documentId = `doc-${Date.now()}`;
        const fileName = `${documentId}.pdf`;
        context.log(`Processing booking ${bookingId}, document ${documentId}`);
        // 1. Upload to Blob Storage
        context.log('Uploading to Blob Storage...');
        const credential = new identity_1.DefaultAzureCredential();
        const blobServiceClient = new storage_blob_1.BlobServiceClient(`https://${STORAGE_ACCOUNT_NAME}.blob.core.windows.net`, credential);
        const containerClient = blobServiceClient.getContainerClient(STORAGE_CONTAINER_NAME);
        await containerClient.createIfNotExists(); // Private container by default
        const blockBlobClient = containerClient.getBlockBlobClient(fileName);
        await blockBlobClient.upload(file, file.length, {
            blobHTTPHeaders: { blobContentType: 'application/pdf' }
        });
        const documentUrl = blockBlobClient.url;
        context.log(`Document uploaded: ${documentUrl}`);
        // 2. Analyze with Form Recognizer
        context.log('Analyzing document with Form Recognizer...');
        const startTime = Date.now();
        const formRecognizerClient = new ai_form_recognizer_1.DocumentAnalysisClient(FORM_RECOGNIZER_ENDPOINT, new ai_form_recognizer_1.AzureKeyCredential(FORM_RECOGNIZER_KEY));
        const poller = await formRecognizerClient.beginAnalyzeDocument('prebuilt-invoice', file);
        const result = await poller.pollUntilDone();
        const processingTimeMs = Date.now() - startTime;
        context.log(`Analysis complete in ${processingTimeMs}ms`);
        // 3. Extract booking data from Form Recognizer results
        const document = result.documents?.[0];
        const fields = document?.fields || {};
        // Calculate overall confidence
        const confidenceScores = {};
        let totalConfidence = 0;
        let fieldCount = 0;
        Object.entries(fields).forEach(([key, field]) => {
            if (field?.confidence !== undefined) {
                confidenceScores[key] = field.confidence;
                totalConfidence += field.confidence;
                fieldCount++;
            }
        });
        const overallConfidence = fieldCount > 0 ? totalConfidence / fieldCount : 0;
        // Extract specific fields (Form Recognizer invoice model)
        const extractField = (fieldName) => {
            const field = fields[fieldName];
            if (!field)
                return '';
            // Handle different field types
            if ('content' in field && field.content) {
                return String(field.content);
            }
            if ('value' in field && field.value) {
                return String(field.value);
            }
            return '';
        };
        const booking = {
            id: bookingId,
            tenantId: user.tenantId || 'default', // From JWT token or default
            documentId,
            documentUrl,
            uploadedBy: user.email,
            uploadedByName: user.name,
            uploadedByUserId: user.userId,
            uploadTimestamp: new Date().toISOString(),
            processingStatus: 'completed',
            overallConfidence: Math.round(overallConfidence * 100) / 100,
            dcsaPlusData: {
                carrierBookingReference: extractField('InvoiceId') || extractField('PurchaseOrder'),
                shipmentDetails: {
                    carrierCode: extractField('VendorName'),
                    portOfLoading: {
                        UNLocationCode: '',
                        locationName: extractField('ShipFromAddress')
                    },
                    portOfDischarge: {
                        UNLocationCode: '',
                        locationName: extractField('ShipToAddress')
                    }
                },
                containers: [],
                inlandExtensions: {
                    transportMode: 'barge',
                    pickupDetails: {
                        facilityName: extractField('ShipFromAddress')
                    },
                    deliveryDetails: {
                        facilityName: extractField('ShipToAddress')
                    }
                },
                parties: {
                    vendor: extractField('VendorName'),
                    customer: extractField('CustomerName')
                }
            },
            extractionMetadata: {
                modelId: 'prebuilt-invoice',
                modelVersion: result.modelId || '1.0',
                confidenceScores,
                uncertainFields: Object.entries(confidenceScores)
                    .filter(([_, confidence]) => typeof confidence === 'number' && confidence < 0.8)
                    .map(([field, _]) => field),
                processingTimeMs,
                extractionTimestamp: new Date().toISOString()
            },
            validationHistory: [],
            rawFormRecognizerData: result.documents?.[0] // Store full results for debugging
        };
        // 4. Store in Cosmos DB
        context.log('Storing booking in Cosmos DB...');
        const cosmosClient = new cosmos_1.CosmosClient({
            endpoint: COSMOS_ENDPOINT,
            key: COSMOS_KEY
        });
        const database = cosmosClient.database(COSMOS_DATABASE_NAME);
        const container = database.container(COSMOS_CONTAINER_NAME);
        await container.items.create(booking);
        context.log(`Booking ${bookingId} stored successfully`);
        // Remove raw data from response
        const { rawFormRecognizerData, ...responseBooking } = booking;
        context.res = {
            status: 202,
            body: responseBooking,
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
    catch (error) {
        context.log.error('Error in UploadDocument:', error);
        context.res = {
            status: 500,
            body: {
                error: 'Internal server error',
                message: error.message,
                details: error.stack
            },
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
};
exports.default = httpTrigger;
//# sourceMappingURL=index.js.map