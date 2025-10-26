import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { getUserFromRequest } from "../shared/auth";
import { ProcessingJobService } from "../shared/services/ProcessingJobService";
import { HTTP_STATUS, ERROR_MESSAGES, STORAGE_CONFIG } from "../shared/constants";

const COSMOS_ENDPOINT = process.env.COSMOS_DB_ENDPOINT || process.env.COSMOS_ENDPOINT;
const COSMOS_KEY = process.env.COSMOS_DB_KEY;
const COSMOS_DATABASE_NAME = process.env.COSMOS_DATABASE_NAME || STORAGE_CONFIG.DEFAULT_DATABASE_NAME;

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('GetProcessingJob triggered');

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

        // Validate environment variables
        if (!COSMOS_ENDPOINT || !COSMOS_KEY) {
            throw new Error(ERROR_MESSAGES.COSMOS_DB_NOT_CONFIGURED);
        }

        // Get jobId from route parameter
        const jobId = req.params.jobid;
        if (!jobId) {
            context.res = {
                status: HTTP_STATUS.BAD_REQUEST,
                body: { error: 'Missing jobId parameter' }
            };
            return;
        }

        // Get job from database
        const jobService = new ProcessingJobService(
            COSMOS_ENDPOINT,
            COSMOS_KEY,
            COSMOS_DATABASE_NAME,
            'processing-jobs'
        );

        const job = await jobService.getJob(jobId, user.tenantId || 'default');

        if (!job) {
            context.res = {
                status: HTTP_STATUS.NOT_FOUND,
                body: { error: 'Job not found' }
            };
            return;
        }

        // SECURITY: Verify user owns this job
        if (job.userId !== user.userId && job.userEmail !== user.email) {
            context.log.warn(`User ${user.email} attempted to access job ${jobId} owned by ${job.userEmail}`);
            // Return 404 to prevent information disclosure (IDOR protection)
            context.res = {
                status: HTTP_STATUS.NOT_FOUND,
                body: { error: 'Job not found' }
            };
            return;
        }

        // Return job status
        context.res = {
            status: HTTP_STATUS.OK,
            body: job,
            headers: {
                'Content-Type': 'application/json'
            }
        };

    } catch (error: any) {
        context.log.error('Error in GetProcessingJob:', error);

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

export default httpTrigger;
