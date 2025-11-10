import { ApiError } from '../types';
export declare class AsrApiError extends Error implements ApiError {
    status: number;
    code?: string;
    details?: unknown;
    constructor(message: string, status: number, code?: string, details?: unknown);
    static fromAxiosError(error: any): AsrApiError;
    /**
     * Check if error is an authentication error
     */
    isAuthError(): boolean;
    /**
     * Check if error is a not found error
     */
    isNotFoundError(): boolean;
    /**
     * Check if error is a validation error
     */
    isValidationError(): boolean;
    /**
     * Check if error is a server error
     */
    isServerError(): boolean;
}
//# sourceMappingURL=error.d.ts.map