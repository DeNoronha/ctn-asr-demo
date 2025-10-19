import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export async function ValidateBooking(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`ValidateBooking triggered`);

    try {
        const bookingId = request.params.bookingId;

        if (!bookingId) {
            return {
                status: 400,
                jsonBody: { error: 'Missing bookingId parameter' }
            };
        }

        // Mock response for MVP
        return {
            status: 200,
            jsonBody: {
                success: true,
                message: 'Validation recorded successfully',
                bookingId
            }
        };

    } catch (error: any) {
        context.error('Error in ValidateBooking:', error);
        return {
            status: 500,
            jsonBody: { error: 'Internal server error', message: error.message }
        };
    }
}

app.http('ValidateBooking', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'v1/bookings/{bookingId}/validate',
    handler: ValidateBooking
});
