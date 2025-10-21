import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";
import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";
import { getUserFromRequest } from "../shared/auth";
import { parseMultipartForm } from "../shared/multipart";
import { extractTextFromPDF, groupPagesIntoDocuments, getPdfPageCount } from "../shared/pdfExtractor";
import { classifyDocument } from "../shared/documentClassifier";
import { extractWithClaude } from "../shared/claudeExtractor";
import { initializeKnowledgeBase, getFewShotExamples } from "../shared/knowledgeBase";
import { DocumentRecord } from "../shared/dcsaSchemas";

// Environment variables
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const COSMOS_ENDPOINT = process.env.COSMOS_DB_ENDPOINT || process.env.COSMOS_ENDPOINT;
const COSMOS_KEY = process.env.COSMOS_DB_KEY;
const STORAGE_ACCOUNT_NAME = process.env.STORAGE_ACCOUNT_NAME;
const COSMOS_DATABASE_NAME = process.env.COSMOS_DATABASE_NAME || 'booking-portal';
const COSMOS_CONTAINER_NAME = process.env.COSMOS_CONTAINER_NAME || 'bookings';
const STORAGE_CONTAINER_NAME = process.env.STORAGE_CONTAINER_NAME || 'documents';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('UploadDocument triggered (Claude API extraction)');

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
        if (!ANTHROPIC_API_KEY) {
            throw new Error('ANTHROPIC_API_KEY not configured');
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

        // Check PDF page count
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

        const cosmosClient = new CosmosClient({
            endpoint: COSMOS_ENDPOINT,
            key: COSMOS_KEY
        });
        const database = cosmosClient.database(COSMOS_DATABASE_NAME);
        const container = database.container(COSMOS_CONTAINER_NAME);

        // Initialize knowledge base
        initializeKnowledgeBase(COSMOS_ENDPOINT, COSMOS_KEY, COSMOS_DATABASE_NAME, 'knowledge-base');

        // Extract text from PDF
        context.log('Extracting text from PDF...');
        const extractionStartTime = Date.now();
        const pdfResult = await extractTextFromPDF(file);
        context.log(`Text extraction complete in ${Date.now() - extractionStartTime}ms`);

        // Group pages into logical documents (handles multi-page PDFs)
        context.log('Grouping pages into documents...');
        const documentGroups = await groupPagesIntoDocuments(file);
        context.log(`Found ${documentGroups.length} document(s) in PDF`);

        const createdDocuments: any[] = [];

        // Process each document group
        for (const group of documentGroups) {
            const documentId = `doc-${Date.now()}-p${group.startPage}`;
            const fileName = `${documentId}.pdf`;

            context.log(`Processing document ${group.startPage}-${group.endPage}: ${documentId}`);

            try {
                // 1. Classify document type and carrier
                context.log('Classifying document...');
                const classification = classifyDocument(group.combinedText);

                if (classification.documentType === 'unknown') {
                    context.log.warn(`Could not classify document ${documentId}`);
                    createdDocuments.push({
                        error: true,
                        documentId,
                        message: 'Could not classify document type',
                        matchedKeywords: classification.matchedKeywords
                    });
                    continue;
                }

                context.log(`Classified as ${classification.documentType} from ${classification.carrier} (confidence: ${classification.confidence.toFixed(2)})`);

                // 2. Upload to Blob Storage
                const blockBlobClient = containerClient.getBlockBlobClient(fileName);
                await blockBlobClient.upload(file, file.length, {
                    blobHTTPHeaders: { blobContentType: 'application/pdf' }
                });
                const documentUrl = blockBlobClient.url;
                context.log(`Document uploaded: ${documentUrl}`);

                // 3. Get few-shot examples from knowledge base
                context.log('Retrieving few-shot examples...');
                const fewShotExamples = await getFewShotExamples(
                    classification.documentType,
                    classification.carrier,
                    5
                );
                context.log(`Retrieved ${fewShotExamples.length} few-shot examples`);

                // 4. Extract structured data with Claude
                context.log('Extracting structured data with Claude...');
                const claudeStartTime = Date.now();

                const extraction = await extractWithClaude({
                    text: group.combinedText,
                    documentType: classification.documentType,
                    carrier: classification.carrier,
                    fewShotExamples
                });

                const claudeTime = Date.now() - claudeStartTime;
                context.log(`Claude extraction complete in ${claudeTime}ms (confidence: ${extraction.confidenceScore.toFixed(2)})`);

                // 5. Create document record
                const documentRecord: DocumentRecord = {
                    id: documentId,
                    documentType: classification.documentType,
                    documentNumber: (extraction.data as any).carrierBookingReference ||
                                   (extraction.data as any).billOfLadingNumber ||
                                   (extraction.data as any).deliveryOrderNumber ||
                                   (extraction.data as any).transportOrderNumber ||
                                   documentId,
                    carrier: classification.carrier,
                    uploadedBy: user.email,
                    uploadTimestamp: new Date().toISOString(),
                    processingStatus: extraction.confidenceScore >= 0.8 ? 'validated' : 'pending',

                    // Document-specific data
                    data: extraction.data,

                    // Extraction metadata
                    extractionMetadata: {
                        modelUsed: 'claude-sonnet-4.5',
                        tokensUsed: extraction.metadata.tokensUsed,
                        processingTimeMs: extraction.metadata.processingTimeMs,
                        confidenceScore: extraction.confidenceScore,
                        fewShotExamplesUsed: extraction.metadata.fewShotExamplesUsed,
                        uncertainFields: extraction.metadata.uncertainFields,
                        extractionTimestamp: extraction.metadata.extractionTimestamp
                    },

                    // Original document
                    documentUrl,
                    pageNumber: group.startPage,
                    totalPages: group.endPage - group.startPage + 1,

                    // Validation
                    validationHistory: []
                };

                // 6. Store in Cosmos DB
                await container.items.create(documentRecord);
                context.log(`Document ${documentId} stored successfully`);

                // Add to results (sanitized for response)
                createdDocuments.push({
                    id: documentId,
                    documentType: classification.documentType,
                    documentNumber: documentRecord.documentNumber,
                    carrier: classification.carrier,
                    confidenceScore: extraction.confidenceScore,
                    processingStatus: documentRecord.processingStatus,
                    pageRange: `${group.startPage}-${group.endPage}`,
                    validationWarnings: extraction.validation.warnings,
                    validationErrors: extraction.validation.errors,
                    uncertainFields: extraction.metadata.uncertainFields
                });

            } catch (docError: any) {
                context.log.error(`Error processing document ${documentId}:`, docError);
                createdDocuments.push({
                    error: true,
                    documentId,
                    message: `Failed to process document: ${docError.message}`
                });
            }
        }

        // Determine overall status
        const successCount = createdDocuments.filter(d => !d.error).length;
        const errorCount = createdDocuments.filter(d => d.error).length;

        context.res = {
            status: successCount > 0 ? 202 : 500,
            body: {
                message: `Processed ${successCount}/${documentGroups.length} document(s) successfully`,
                originalFilename,
                totalPages: pageCount,
                documentsFound: documentGroups.length,
                successCount,
                errorCount,
                documents: createdDocuments
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
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
};

export default httpTrigger;
