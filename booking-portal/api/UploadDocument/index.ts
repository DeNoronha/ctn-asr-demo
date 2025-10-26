import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { DefaultAzureCredential } from "@azure/identity";
import { getUserFromRequest } from "../shared/auth";
import { parseMultipartForm } from "../shared/multipart";
import { initializeKnowledgeBase } from "../shared/knowledgeBase";
import { BlobStorageService, CosmosDbService, DocumentProcessor } from "../shared/services";
import { ProcessingJobService } from "../shared/services/ProcessingJobService";
import { ProcessingJob } from "../shared/processingJobSchemas";
import { applyRateLimit, getRateLimitHeaders } from "../shared/rateLimit";
import {
    FILE_UPLOAD_CONFIG,
    STORAGE_CONFIG,
    HTTP_STATUS,
    ERROR_MESSAGES
} from "../shared/constants";

// Environment variables
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const COSMOS_ENDPOINT = process.env.COSMOS_DB_ENDPOINT || process.env.COSMOS_ENDPOINT;
const COSMOS_KEY = process.env.COSMOS_DB_KEY;
const STORAGE_ACCOUNT_NAME = process.env.STORAGE_ACCOUNT_NAME;
const COSMOS_DATABASE_NAME = process.env.COSMOS_DATABASE_NAME || STORAGE_CONFIG.DEFAULT_DATABASE_NAME;
const COSMOS_CONTAINER_NAME = process.env.COSMOS_CONTAINER_NAME || STORAGE_CONFIG.DEFAULT_CONTAINER;
const STORAGE_CONTAINER_NAME = process.env.STORAGE_CONTAINER_NAME || STORAGE_CONFIG.DEFAULT_CONTAINER_NAME;

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('UploadDocument triggered (Async processing with Claude API)');

    try {
        // Authenticate user
        const user = await getUserFromRequest(context, req);
        if (!user) {
            context.res = {
                status: HTTP_STATUS.UNAUTHORIZED,
                body: {
                    error: ERROR_MESSAGES.UNAUTHORIZED,
                    message: ERROR_MESSAGES.INVALID_TOKEN
                }
            };
            return;
        }

        context.log(`Authenticated user: ${user.email} (${user.name})`);

        // Check rate limit (UPLOAD tier - most restrictive due to Claude API cost)
        const rateLimitResult = applyRateLimit(context, req, user, 'UPLOAD');
        if (rateLimitResult) {
            context.res = rateLimitResult;
            return;
        }

        // Validate environment variables
        if (!ANTHROPIC_API_KEY) {
            throw new Error(ERROR_MESSAGES.ANTHROPIC_KEY_NOT_CONFIGURED);
        }
        if (!COSMOS_ENDPOINT || !COSMOS_KEY) {
            throw new Error(ERROR_MESSAGES.COSMOS_DB_NOT_CONFIGURED);
        }
        if (!STORAGE_ACCOUNT_NAME) {
            throw new Error(ERROR_MESSAGES.STORAGE_NOT_CONFIGURED);
        }

        // Extract file from multipart form data
        const fileUpload = await parseMultipartForm(req);
        if (!fileUpload) {
            context.res = {
                status: HTTP_STATUS.BAD_REQUEST,
                body: { error: ERROR_MESSAGES.NO_FILE_PROVIDED }
            };
            return;
        }

        const file = fileUpload.buffer;
        const originalFilename = fileUpload.filename;

        // Validate file upload
        const validationError = validateFile(file, user.email, context);
        if (validationError) {
            context.res = validationError;
            return;
        }

        context.log(`File validation passed: ${file.length} bytes, PDF header verified`);

        // Create processing job
        const jobService = new ProcessingJobService(
            COSMOS_ENDPOINT,
            COSMOS_KEY,
            COSMOS_DATABASE_NAME,
            'processing-jobs'
        );

        const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const tenantId = user.tenantId || 'default';

        const job: ProcessingJob = {
            id: jobId,
            tenantId,
            userId: user.userId,
            userEmail: user.email,
            status: 'queued',
            stage: 'queued',
            progress: 0,
            originalFilename,
            fileSize: file.length,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await jobService.createJob(job);
        context.log(`Created processing job: ${jobId}`);

        // Return jobId immediately (202 Accepted)
        context.res = {
            status: HTTP_STATUS.ACCEPTED,
            body: {
                jobId,
                status: 'queued',
                message: 'Document upload accepted. Processing started in background.',
                pollUrl: `/api/v1/jobs/${jobId}`
            },
            headers: {
                'Content-Type': 'application/json',
                ...getRateLimitHeaders(req)  // Add rate limit headers
            }
        };

        // Process document asynchronously (don't await)
        processDocumentAsync(
            file,
            originalFilename,
            user,
            jobId,
            COSMOS_ENDPOINT,
            COSMOS_KEY,
            COSMOS_DATABASE_NAME,
            COSMOS_CONTAINER_NAME,
            STORAGE_ACCOUNT_NAME,
            STORAGE_CONTAINER_NAME,
            context
        ).catch(error => {
            context.log.error(`Background processing failed for job ${jobId}:`, error);
        });

    } catch (error: any) {
        context.log.error('Error in UploadDocument:', error);
        context.log.error('Error stack:', error.stack);

        // Log debugging info (server-side only)
        context.log.error('Debug info:', {
            hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
            hasCosmosEndpoint: !!(process.env.COSMOS_ENDPOINT || process.env.COSMOS_DB_ENDPOINT),
            hasCosmosKey: !!process.env.COSMOS_DB_KEY,
            hasStorageAccount: !!process.env.STORAGE_ACCOUNT_NAME,
            errorName: error.name,
            errorMessage: error.message
        });

        // SECURITY: Sanitized error message - don't expose internal details to client
        context.res = {
            status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
            body: {
                error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
                timestamp: new Date().toISOString()
            },
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
};

/**
 * Process document asynchronously in background
 */
async function processDocumentAsync(
    file: Buffer,
    originalFilename: string,
    user: any,
    jobId: string,
    cosmosEndpoint: string,
    cosmosKey: string,
    cosmosDatabase: string,
    cosmosContainer: string,
    storageAccountName: string,
    storageContainerName: string,
    context: Context
): Promise<void> {
    try {
        context.log(`Background processing started for job ${jobId}`);

        // Initialize services
        const credential = new DefaultAzureCredential();
        const blobService = new BlobStorageService(
            storageAccountName,
            storageContainerName,
            credential
        );

        const cosmosService = new CosmosDbService(
            cosmosEndpoint,
            cosmosKey,
            cosmosDatabase,
            cosmosContainer
        );

        const jobService = new ProcessingJobService(
            cosmosEndpoint,
            cosmosKey,
            cosmosDatabase,
            'processing-jobs'
        );

        // Initialize knowledge base
        initializeKnowledgeBase(
            cosmosEndpoint,
            cosmosKey,
            cosmosDatabase,
            STORAGE_CONFIG.KNOWLEDGE_BASE_CONTAINER
        );

        // Process document
        const processor = new DocumentProcessor(blobService, cosmosService, context, jobService);
        const result = await processor.processDocument({
            fileBuffer: file,
            originalFilename,
            user,
            jobId
        });

        // Mark job as completed
        await jobService.completeJob(jobId, user.tenantId || 'default', result);
        context.log(`Job ${jobId} completed successfully`);

    } catch (error: any) {
        context.log.error(`Job ${jobId} failed:`, error);

        // Mark job as failed
        try {
            const jobService = new ProcessingJobService(
                cosmosEndpoint,
                cosmosKey,
                cosmosDatabase,
                'processing-jobs'
            );
            await jobService.failJob(
                jobId,
                user.tenantId || 'default',
                error.message || 'Unknown error',
                'failed'
            );
        } catch (updateError: any) {
            context.log.error(`Failed to update job status:`, updateError);
        }
    }
}

/**
 * Validate uploaded file
 *
 * @param file - File buffer
 * @param userEmail - User email for logging
 * @param context - Azure Functions context
 * @returns Error response if validation fails, null if valid
 */
function validateFile(file: Buffer, userEmail: string, context: Context): any {
    // 1. Validate PDF header (magic bytes)
    const pdfHeader = file.toString('utf8', 0, 5);
    if (!pdfHeader.includes(FILE_UPLOAD_CONFIG.PDF_HEADER_SIGNATURE)) {
        context.log.warn(`Invalid PDF file uploaded by ${userEmail}: missing PDF header`);
        return {
            status: HTTP_STATUS.BAD_REQUEST,
            body: { error: ERROR_MESSAGES.INVALID_FILE_FORMAT }
        };
    }

    // 2. Validate file size
    if (file.length > FILE_UPLOAD_CONFIG.MAX_FILE_SIZE) {
        context.log.warn(`File too large uploaded by ${userEmail}: ${file.length} bytes`);
        return {
            status: HTTP_STATUS.PAYLOAD_TOO_LARGE,
            body: { error: ERROR_MESSAGES.FILE_TOO_LARGE }
        };
    }

    return null;
}

export default httpTrigger;
