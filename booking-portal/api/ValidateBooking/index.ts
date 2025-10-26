import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { getUserFromRequest } from "../shared/auth";
import { CosmosDbService } from "../shared/services";
import {
    STORAGE_CONFIG,
    HTTP_STATUS,
    ERROR_MESSAGES
} from "../shared/constants";

// Environment variables
const COSMOS_ENDPOINT = process.env.COSMOS_DB_ENDPOINT || process.env.COSMOS_ENDPOINT;
const COSMOS_KEY = process.env.COSMOS_DB_KEY;
const COSMOS_DATABASE_NAME = process.env.COSMOS_DATABASE_NAME || STORAGE_CONFIG.DEFAULT_DATABASE_NAME;
const COSMOS_CONTAINER_NAME = process.env.COSMOS_CONTAINER_NAME || STORAGE_CONFIG.DEFAULT_CONTAINER;

interface ValidationRequest {
    action: 'approve' | 'correct' | 'reject';
    corrections?: Record<string, any>;
    notes?: string;
}

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('ValidateBooking triggered');

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

        context.log(`Authenticated user: ${user.email}`);

        // Azure Functions v4 lowercases route parameters
        const bookingId = context.bindingData.bookingid;
        const validation: ValidationRequest = req.body;

        if (!validation || !validation.action) {
            context.res = {
                status: HTTP_STATUS.BAD_REQUEST,
                body: {
                    error: 'Bad request',
                    message: 'Validation action required (approve, correct, or reject)'
                }
            };
            return;
        }

        context.log(`Validating booking ${bookingId} with action: ${validation.action}`);

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

        // Find booking by ID (without needing partition key upfront)
        const queryResult = await cosmosService.queryDocuments({
            tenantId: user.tenantId
        });

        const booking = queryResult.items.find(b => b.id === bookingId);

        if (!booking) {
            context.res = {
                status: HTTP_STATUS.NOT_FOUND,
                body: {
                    error: 'Not found',
                    message: `Booking ${bookingId} not found`
                }
            };
            return;
        }

        // Map validation action to past tense for ValidationEvent
        const actionMap: Record<string, 'approved' | 'rejected' | 'corrected'> = {
            'approve': 'approved',
            'reject': 'rejected',
            'correct': 'corrected'
        };

        // Create validation record
        const validationRecord = {
            timestamp: new Date().toISOString(),
            validatedBy: user.email,
            action: actionMap[validation.action],
            changes: validation.corrections,
            comments: validation.notes
        };

        // Update validation history
        booking.validationHistory = booking.validationHistory || [];
        booking.validationHistory.push(validationRecord);

        // Update processing status based on action
        switch (validation.action) {
            case 'approve':
                booking.processingStatus = 'validated';
                break;
            case 'correct':
                // Apply corrections to data
                if (validation.corrections) {
                    booking.data = {
                        ...booking.data,
                        ...validation.corrections
                    };
                }
                booking.processingStatus = 'validated'; // Corrected documents are validated
                break;
            case 'reject':
                booking.processingStatus = 'rejected';
                break;
        }

        // Update document using service
        const updatedBooking = await cosmosService.updateDocument(
            bookingId,
            booking.tenantId,
            booking
        );

        context.log(`Booking ${bookingId} validated successfully by ${user.email}`);

        context.res = {
            status: HTTP_STATUS.OK,
            body: {
                success: true,
                bookingId,
                action: validation.action,
                newStatus: updatedBooking.processingStatus,
                message: 'Validation recorded successfully'
            },
            headers: {
                'Content-Type': 'application/json'
            }
        };

    } catch (error: any) {
        context.log.error('Error in ValidateBooking:', error);
        // SECURITY: Sanitized error message - don't expose internal details
        context.res = {
            status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
            body: {
                error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
            },
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
};

export default httpTrigger;
