import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { getUserFromRequest } from "../shared/auth";
import { CosmosDbService } from "../shared/services";
import { STORAGE_CONFIG, PAGINATION_CONFIG, HTTP_STATUS, ERROR_MESSAGES } from "../shared/constants";

// Environment variables
const COSMOS_ENDPOINT = process.env.COSMOS_DB_ENDPOINT || process.env.COSMOS_ENDPOINT;
const COSMOS_KEY = process.env.COSMOS_DB_KEY;
const COSMOS_DATABASE_NAME = process.env.COSMOS_DATABASE_NAME || STORAGE_CONFIG.DEFAULT_DATABASE_NAME;
const COSMOS_CONTAINER_NAME = process.env.COSMOS_CONTAINER_NAME || STORAGE_CONFIG.DEFAULT_CONTAINER;

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('GetBookings triggered');

    try {
        // CRITICAL: Authenticate user
        const user = await getUserFromRequest(context, req);
        if (!user) {
            context.res = {
                status: HTTP_STATUS.UNAUTHORIZED,
                body: { error: ERROR_MESSAGES.UNAUTHORIZED },
                headers: { 'Content-Type': 'application/json' }
            };
            return;
        }

        context.log(`Authenticated user: ${user.email}`);

        // Validate environment variables
        if (!COSMOS_ENDPOINT || !COSMOS_KEY) {
            throw new Error(ERROR_MESSAGES.COSMOS_DB_NOT_CONFIGURED);
        }

        // Initialize Cosmos DB service
        const cosmosService = new CosmosDbService(
            COSMOS_ENDPOINT,
            COSMOS_KEY,
            COSMOS_DATABASE_NAME,
            COSMOS_CONTAINER_NAME
        );

        // Get query parameters
        const statusFilter = req.query.status;
        const documentTypeFilter = req.query.documentType;
        const carrierFilter = req.query.carrier;
        const limit = parseInt(req.query.limit as string) || PAGINATION_CONFIG.DEFAULT_LIMIT;
        const continuationToken = req.query.continuationToken;

        context.log(
            `Filters - Status: ${statusFilter || 'all'}, ` +
            `DocumentType: ${documentTypeFilter || 'all'}, ` +
            `Carrier: ${carrierFilter || 'all'}, ` +
            `Limit: ${limit}`
        );

        // Query documents with pagination
        const result = await cosmosService.queryDocuments({
            tenantId: user.tenantId,
            status: statusFilter,
            documentType: documentTypeFilter,
            carrier: carrierFilter,
            limit,
            continuationToken
        });

        context.log(`Retrieved ${result.items.length} bookings from Cosmos DB`);

        // Format response to match expected structure
        const formattedBookings = result.items.map(booking => ({
            id: booking.id,
            documentType: booking.documentType,
            documentNumber: booking.documentNumber,
            carrier: booking.carrier,
            containerNumber: booking.data?.containers?.[0]?.containerNumber || '',
            carrierBookingReference: booking.documentNumber,
            uploadTimestamp: booking.uploadTimestamp,
            processingStatus: booking.processingStatus,
            confidenceScore: booking.extractionMetadata.confidenceScore,
            uncertainFields: booking.extractionMetadata.uncertainFields
        }));

        context.res = {
            status: HTTP_STATUS.OK,
            body: {
                data: formattedBookings,
                pagination: {
                    limit,
                    hasMore: result.hasMore,
                    continuationToken: result.continuationToken
                }
            },
            headers: {
                'Content-Type': 'application/json'
            }
        };

    } catch (error: any) {
        context.log.error('Error in GetBookings:', error);
        // SECURITY: Sanitized error message - don't expose internal details
        context.res = {
            status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
            body: { error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR },
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
};

export default httpTrigger;
