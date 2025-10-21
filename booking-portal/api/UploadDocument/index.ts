import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";
import { DocumentAnalysisClient, AzureKeyCredential } from "@azure/ai-form-recognizer";
import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";
import { getUserFromRequest } from "../shared/auth";
import { parseMultipartForm } from "../shared/multipart";
import { splitPdfIntoPages, getPdfPageCount } from "../shared/pdfSplitter";

// Environment variables
const FORM_RECOGNIZER_ENDPOINT = process.env.DOCUMENT_INTELLIGENCE_ENDPOINT || process.env.FORM_RECOGNIZER_ENDPOINT;
const FORM_RECOGNIZER_KEY = process.env.DOCUMENT_INTELLIGENCE_KEY;
const COSMOS_ENDPOINT = process.env.COSMOS_DB_ENDPOINT || process.env.COSMOS_ENDPOINT;
const COSMOS_KEY = process.env.COSMOS_DB_KEY;
const STORAGE_ACCOUNT_NAME = process.env.STORAGE_ACCOUNT_NAME;
const COSMOS_DATABASE_NAME = process.env.COSMOS_DATABASE_NAME || 'booking-portal';
const COSMOS_CONTAINER_NAME = process.env.COSMOS_CONTAINER_NAME || 'bookings';
const STORAGE_CONTAINER_NAME = process.env.STORAGE_CONTAINER_NAME || 'documents';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('UploadDocument triggered');

    try {
        // Authenticate user
        const user = await getUserFromRequest(context, req);
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
        const fileUpload = await parseMultipartForm(req);
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
        const pageCount = await getPdfPageCount(file);
        context.log(`PDF has ${pageCount} page(s)`);

        // Initialize Azure clients
        const credential = new DefaultAzureCredential();
        const blobServiceClient = new BlobServiceClient(
            `https://${STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
            credential
        );
        const containerClient = blobServiceClient.getContainerClient(STORAGE_CONTAINER_NAME);
        await containerClient.createIfNotExists();

        const formRecognizerClient = new DocumentAnalysisClient(
            FORM_RECOGNIZER_ENDPOINT,
            new AzureKeyCredential(FORM_RECOGNIZER_KEY)
        );

        const cosmosClient = new CosmosClient({
            endpoint: COSMOS_ENDPOINT,
            key: COSMOS_KEY
        });
        const database = cosmosClient.database(COSMOS_DATABASE_NAME);
        const container = database.container(COSMOS_CONTAINER_NAME);

        // Split PDF into individual pages
        const pages = await splitPdfIntoPages(file);
        context.log(`Split PDF into ${pages.length} individual page(s)`);

        const createdBookings: any[] = [];

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

                // 2. Analyze with Form Recognizer
                const startTime = Date.now();
                const poller = await formRecognizerClient.beginAnalyzeDocument(
                    'prebuilt-invoice',
                    page.pdfBuffer
                );
                const result = await poller.pollUntilDone();
                const processingTimeMs = Date.now() - startTime;
                context.log(`Page ${page.pageNumber} analysis complete in ${processingTimeMs}ms`);

                // 3. Extract booking data from Form Recognizer results
                const document = result.documents?.[0];
                const fields = document?.fields || {};

                // Calculate overall confidence
                const confidenceScores: any = {};
                let totalConfidence = 0;
                let fieldCount = 0;

                Object.entries(fields).forEach(([key, field]: [string, any]) => {
                    if (field?.confidence !== undefined) {
                        confidenceScores[key] = field.confidence;
                        totalConfidence += field.confidence;
                        fieldCount++;
                    }
                });

                const overallConfidence = fieldCount > 0 ? totalConfidence / fieldCount : 0;

                // Extract specific fields (Form Recognizer invoice model)
                const extractField = (fieldName: string): string => {
                    const field = fields[fieldName];
                    if (!field) return '';

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
                            transportMode: 'barge' as const,
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
                    validationHistory: []
                };

                // 4. Store in Cosmos DB
                await container.items.create(booking);
                context.log(`Page ${page.pageNumber} booking ${bookingId} stored successfully`);

                // Add to results (without raw data)
                createdBookings.push(booking);

            } catch (pageError: any) {
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

    } catch (error: any) {
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

export default httpTrigger;
