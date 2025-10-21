import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";
import { getUserFromRequest } from "../shared/auth";
import { initializeKnowledgeBase, addToKnowledgeBase, shouldAddToKnowledgeBase } from "../shared/knowledgeBase";
import { DocumentType, DocumentData, validateDocumentData } from "../shared/dcsaSchemas";

// Environment variables
const COSMOS_ENDPOINT = process.env.COSMOS_DB_ENDPOINT || process.env.COSMOS_ENDPOINT;
const COSMOS_KEY = process.env.COSMOS_DB_KEY;
const COSMOS_DATABASE_NAME = process.env.COSMOS_DATABASE_NAME || 'booking-portal';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('AddToKnowledgeBase triggered');

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
        if (!COSMOS_ENDPOINT || !COSMOS_KEY) {
            throw new Error('Cosmos DB credentials not configured');
        }

        // Parse request body
        const {
            documentId,
            documentType,
            carrier,
            documentText,
            extractedData,
            confidenceScore
        } = req.body || {};

        // Validate required fields
        if (!documentId || !documentType || !carrier || !documentText || !extractedData) {
            context.res = {
                status: 400,
                body: {
                    error: 'Missing required fields',
                    required: ['documentId', 'documentType', 'carrier', 'documentText', 'extractedData']
                }
            };
            return;
        }

        // Validate document type
        const validTypes: DocumentType[] = ['booking_confirmation', 'bill_of_lading', 'delivery_order', 'transport_order'];
        if (!validTypes.includes(documentType)) {
            context.res = {
                status: 400,
                body: {
                    error: 'Invalid document type',
                    validTypes
                }
            };
            return;
        }

        // Validate extracted data
        const validation = validateDocumentData(extractedData as DocumentData);
        if (!validation.valid) {
            context.res = {
                status: 400,
                body: {
                    error: 'Invalid extracted data',
                    validationErrors: validation.errors,
                    validationWarnings: validation.warnings
                }
            };
            return;
        }

        // Check if should add to knowledge base
        const score = confidenceScore || 0.9;
        if (!shouldAddToKnowledgeBase(score, validation.errors)) {
            context.res = {
                status: 400,
                body: {
                    error: 'Quality threshold not met',
                    message: 'Only high-confidence, validated extractions can be added to knowledge base',
                    confidenceScore: score,
                    minConfidence: 0.85,
                    validationErrors: validation.errors
                }
            };
            return;
        }

        // Initialize knowledge base
        initializeKnowledgeBase(COSMOS_ENDPOINT, COSMOS_KEY, COSMOS_DATABASE_NAME, 'knowledge-base');

        // Add to knowledge base
        context.log(`Adding document ${documentId} to knowledge base`);
        const example = await addToKnowledgeBase(
            documentType,
            carrier.toLowerCase(),
            documentText,
            extractedData as DocumentData,
            user.email,
            score
        );

        context.log(`Successfully added example ${example.id} to knowledge base`);

        // Also update the original document in bookings container
        const cosmosClient = new CosmosClient({
            endpoint: COSMOS_ENDPOINT,
            key: COSMOS_KEY
        });
        const database = cosmosClient.database(COSMOS_DATABASE_NAME);
        const bookingsContainer = database.container('bookings');

        try {
            const { resource: document } = await bookingsContainer.item(documentId, documentId).read();
            if (document) {
                document.processingStatus = 'validated';
                if (!document.validationHistory) {
                    document.validationHistory = [];
                }
                document.validationHistory.push({
                    timestamp: new Date().toISOString(),
                    validatedBy: user.email,
                    action: 'approved',
                    comments: 'Added to knowledge base'
                });
                await bookingsContainer.item(documentId, documentId).replace(document);
                context.log(`Updated document ${documentId} status to validated`);
            }
        } catch (error: any) {
            context.log.warn(`Could not update original document: ${error.message}`);
            // Continue - knowledge base addition was successful
        }

        context.res = {
            status: 201,
            body: {
                message: 'Successfully added to knowledge base',
                exampleId: example.id,
                documentType: example.documentType,
                carrier: example.carrier,
                confidenceScore: example.confidenceScore,
                validatedBy: example.validatedBy,
                validatedDate: example.validatedDate
            },
            headers: {
                'Content-Type': 'application/json'
            }
        };

    } catch (error: any) {
        context.log.error('Error in AddToKnowledgeBase:', error);
        context.res = {
            status: 500,
            body: {
                error: 'Internal server error',
                message: error.message,
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
};

export default httpTrigger;
