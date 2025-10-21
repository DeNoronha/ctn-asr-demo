"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storage_blob_1 = require("@azure/storage-blob");
const ai_form_recognizer_1 = require("@azure/ai-form-recognizer");
const cosmos_1 = require("@azure/cosmos");
const identity_1 = require("@azure/identity");
const auth_1 = require("../shared/auth");
const multipart_1 = require("../shared/multipart");
const pdfSplitter_1 = require("../shared/pdfSplitter");
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
        const fileUpload = await (0, multipart_1.parseMultipartForm)(req);
        if (!fileUpload) {
            context.res = {
                status: 400,
                body: { error: 'No file provided or invalid file format' }
            };
            return;
        }
        const file = fileUpload.buffer;
        const originalFilename = fileUpload.filename;
        // Check if PDF has multiple pages
        context.log('Checking PDF page count...');
        const pageCount = await (0, pdfSplitter_1.getPdfPageCount)(file);
        context.log(`PDF has ${pageCount} page(s)`);
        // TEMPORARY: Disable PDF splitting to test if it improves extraction quality
        // When splitting is disabled, process the whole PDF as one booking
        const ENABLE_PDF_SPLITTING = false;
        // Initialize Azure clients
        const credential = new identity_1.DefaultAzureCredential();
        const blobServiceClient = new storage_blob_1.BlobServiceClient(`https://${STORAGE_ACCOUNT_NAME}.blob.core.windows.net`, credential);
        const containerClient = blobServiceClient.getContainerClient(STORAGE_CONTAINER_NAME);
        await containerClient.createIfNotExists();
        const formRecognizerClient = new ai_form_recognizer_1.DocumentAnalysisClient(FORM_RECOGNIZER_ENDPOINT, new ai_form_recognizer_1.AzureKeyCredential(FORM_RECOGNIZER_KEY));
        const cosmosClient = new cosmos_1.CosmosClient({
            endpoint: COSMOS_ENDPOINT,
            key: COSMOS_KEY
        });
        const database = cosmosClient.database(COSMOS_DATABASE_NAME);
        const container = database.container(COSMOS_CONTAINER_NAME);
        // Split PDF into individual pages (if enabled)
        const pages = ENABLE_PDF_SPLITTING
            ? await (0, pdfSplitter_1.splitPdfIntoPages)(file)
            : [{ pageNumber: 1, pdfBuffer: file }]; // Process whole PDF as single "page"
        context.log(ENABLE_PDF_SPLITTING
            ? `Split PDF into ${pages.length} individual page(s)`
            : `Processing full ${pageCount}-page PDF as single document`);
        const createdBookings = [];
        // Process each page as a separate booking
        for (const page of pages) {
            const bookingId = `booking-${Date.now()}-p${page.pageNumber}`;
            const documentId = `doc-${Date.now()}-p${page.pageNumber}`;
            const fileName = `${documentId}.pdf`;
            context.log(`Processing page ${page.pageNumber}/${pages.length}: ${bookingId}`);
            try {
                // 1. Upload page to Blob Storage
                const blockBlobClient = containerClient.getBlockBlobClient(fileName);
                await blockBlobClient.upload(page.pdfBuffer, page.pdfBuffer.length, {
                    blobHTTPHeaders: { blobContentType: 'application/pdf' }
                });
                const documentUrl = blockBlobClient.url;
                context.log(`Page ${page.pageNumber} uploaded: ${documentUrl}`);
                // 2. Analyze with Form Recognizer using prebuilt-layout model
                // Better for delivery orders/shipping documents vs invoice model
                const startTime = Date.now();
                const poller = await formRecognizerClient.beginAnalyzeDocument('prebuilt-layout', page.pdfBuffer);
                const result = await poller.pollUntilDone();
                const processingTimeMs = Date.now() - startTime;
                context.log(`Page ${page.pageNumber} analysis complete in ${processingTimeMs}ms`);
                // 3. Extract booking data from Form Recognizer results (prebuilt-layout model)
                const allText = result.content || '';
                const keyValuePairs = result.keyValuePairs || [];
                // Build a map of detected key-value pairs
                const kvMap = new Map();
                keyValuePairs.forEach((pair) => {
                    if (pair.key && pair.value) {
                        const keyText = pair.key.content?.toLowerCase() || '';
                        const valueText = pair.value.content || '';
                        kvMap.set(keyText, {
                            value: valueText,
                            confidence: pair.confidence || 0
                        });
                    }
                });
                // Calculate overall confidence from key-value pairs
                const confidenceScores = {};
                let totalConfidence = 0;
                let fieldCount = 0;
                kvMap.forEach((data, key) => {
                    if (data.confidence !== undefined) {
                        confidenceScores[key] = data.confidence;
                        totalConfidence += data.confidence;
                        fieldCount++;
                    }
                });
                const overallConfidence = fieldCount > 0 ? totalConfidence / fieldCount : 0;
                // Helper to find value by key patterns
                const findByKeyPattern = (patterns) => {
                    for (const pattern of patterns) {
                        for (const [key, data] of kvMap) {
                            if (key.includes(pattern.toLowerCase())) {
                                return data.value;
                            }
                        }
                    }
                    return '';
                };
                // Helper to extract with regex pattern from full text
                const extractWithPattern = (pattern) => {
                    const match = allText.match(pattern);
                    return match ? match[1]?.trim() || match[0]?.trim() || '' : '';
                };
                const booking = {
                    id: bookingId,
                    tenantId: user.tenantId || 'default',
                    documentId,
                    documentUrl,
                    originalFilename,
                    pageNumber: page.pageNumber,
                    totalPages: pages.length,
                    uploadedBy: user.email,
                    uploadedByName: user.name,
                    uploadedByUserId: user.userId,
                    uploadTimestamp: new Date().toISOString(),
                    processingStatus: 'pending',
                    overallConfidence: Math.round(overallConfidence * 100) / 100,
                    dcsaPlusData: {
                        carrierBookingReference: findByKeyPattern(['booking', 'booking ref', 'booking number', 'reference', 'order number']) ||
                            extractWithPattern(/(?:booking|reference|order)[\s#:]*([A-Z0-9]{6,})/i),
                        shipmentDetails: {
                            carrierCode: findByKeyPattern(['carrier', 'shipping line', 'line']) ||
                                extractWithPattern(/(?:OOCL|MAERSK|MSC|CMA|COSCO|HAPAG|EVERGREEN)/i),
                            portOfLoading: {
                                UNLocationCode: extractWithPattern(/([A-Z]{5})\s*(?:POL|port of loading|loading)/i),
                                locationName: findByKeyPattern(['port of loading', 'pol', 'loading port', 'load port']) ||
                                    extractWithPattern(/(?:port of loading|pol)[:\s]*([^\n]+)/i)
                            },
                            portOfDischarge: {
                                UNLocationCode: extractWithPattern(/([A-Z]{5})\s*(?:POD|port of discharge|discharge)/i),
                                locationName: findByKeyPattern(['port of discharge', 'pod', 'discharge port', 'destination']) ||
                                    extractWithPattern(/(?:port of discharge|pod|destination)[:\s]*([^\n]+)/i)
                            }
                        },
                        containers: [],
                        inlandExtensions: {
                            transportMode: 'barge',
                            pickupDetails: {
                                facilityName: findByKeyPattern(['pickup', 'pick up', 'collection', 'origin']) ||
                                    extractWithPattern(/(?:pickup|collection|origin)[:\s]*([^\n]+)/i)
                            },
                            deliveryDetails: {
                                facilityName: findByKeyPattern(['delivery', 'deliver to', 'final destination']) ||
                                    extractWithPattern(/(?:delivery|deliver to|final destination)[:\s]*([^\n]+)/i)
                            }
                        },
                        parties: {
                            vendor: findByKeyPattern(['shipper', 'consignor', 'sender']) ||
                                extractWithPattern(/(?:shipper|consignor)[:\s]*([^\n]+)/i),
                            customer: findByKeyPattern(['consignee', 'receiver', 'notify party']) ||
                                extractWithPattern(/(?:consignee|receiver)[:\s]*([^\n]+)/i)
                        }
                    },
                    extractionMetadata: {
                        modelId: 'prebuilt-layout',
                        modelVersion: result.modelId || '1.0',
                        confidenceScores,
                        uncertainFields: Object.entries(confidenceScores)
                            .filter(([_, confidence]) => typeof confidence === 'number' && confidence < 0.8)
                            .map(([field, _]) => field),
                        processingTimeMs,
                        extractionTimestamp: new Date().toISOString()
                    },
                    validationHistory: []
                };
                // 4. Store in Cosmos DB
                await container.items.create(booking);
                context.log(`Page ${page.pageNumber} booking ${bookingId} stored successfully`);
                // Add to results (without raw data)
                createdBookings.push(booking);
            }
            catch (pageError) {
                context.log.error(`Error processing page ${page.pageNumber}:`, pageError);
                // Continue with other pages even if one fails
                createdBookings.push({
                    error: true,
                    pageNumber: page.pageNumber,
                    message: `Failed to process page ${page.pageNumber}: ${pageError.message}`
                });
            }
        }
        context.res = {
            status: 202,
            body: {
                message: `Processed ${createdBookings.length} page(s) from uploaded PDF`,
                totalPages: pages.length,
                bookings: createdBookings
            },
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