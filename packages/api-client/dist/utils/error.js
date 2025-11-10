export class AsrApiError extends Error {
    constructor(message, status, code, details) {
        super(message);
        this.name = 'AsrApiError';
        this.status = status;
        this.code = code;
        this.details = details;
        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AsrApiError);
        }
    }
    static fromAxiosError(error) {
        if (error.response) {
            // Server responded with error status
            const responseData = error.response.data;
            return new AsrApiError(responseData?.error || error.message, error.response.status, responseData?.code, responseData?.details);
        }
        else if (error.request) {
            // Request made but no response received
            return new AsrApiError('No response from server', 0, 'NETWORK_ERROR');
        }
        else {
            // Error setting up request
            return new AsrApiError(error.message, 0, 'UNKNOWN_ERROR');
        }
    }
    /**
     * Check if error is an authentication error
     */
    isAuthError() {
        return this.status === 401 || this.status === 403;
    }
    /**
     * Check if error is a not found error
     */
    isNotFoundError() {
        return this.status === 404;
    }
    /**
     * Check if error is a validation error
     */
    isValidationError() {
        return this.status === 400;
    }
    /**
     * Check if error is a server error
     */
    isServerError() {
        return this.status >= 500;
    }
}
