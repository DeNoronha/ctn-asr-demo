/**
 * Application constants and configuration values
 *
 * This file centralizes magic numbers and configuration constants
 * used throughout the booking portal API.
 */

/**
 * Claude AI Configuration
 */
export const CLAUDE_CONFIG = {
    /** Claude model to use for document extraction */
    MODEL: 'claude-sonnet-4-5-20250929' as const,

    /** Temperature for Claude API (0 = deterministic) */
    TEMPERATURE: 0,

    /** Maximum tokens in Claude response */
    MAX_TOKENS: 4000,

    /** Confidence score threshold for auto-validation */
    AUTO_VALIDATE_THRESHOLD: 0.8,

    /** Number of few-shot examples to include */
    DEFAULT_FEW_SHOT_EXAMPLES: 5
};

/**
 * File Upload Configuration
 */
export const FILE_UPLOAD_CONFIG = {
    /** Maximum file size in bytes (10MB) */
    MAX_FILE_SIZE: 10 * 1024 * 1024,

    /** PDF file header signature for validation */
    PDF_HEADER_SIGNATURE: '%PDF-',

    /** Allowed content types */
    ALLOWED_CONTENT_TYPES: ['application/pdf'] as const
};

/**
 * Pagination Configuration
 */
export const PAGINATION_CONFIG = {
    /** Default number of items per page */
    DEFAULT_LIMIT: 50,

    /** Maximum number of items per page */
    MAX_LIMIT: 100,

    /** Minimum number of items per page */
    MIN_LIMIT: 1
};

/**
 * Document Processing Configuration
 */
export const DOCUMENT_CONFIG = {
    /** Timeout for document processing in milliseconds */
    PROCESSING_TIMEOUT_MS: 60000, // 60 seconds

    /** Timeout for Claude API calls in milliseconds */
    CLAUDE_TIMEOUT_MS: 30000, // 30 seconds

    /** Timeout for Azure Document Intelligence OCR */
    OCR_TIMEOUT_MS: 45000, // 45 seconds
};

/**
 * Azure Storage Configuration
 */
export const STORAGE_CONFIG = {
    /** Default blob container name */
    DEFAULT_CONTAINER_NAME: 'documents' as const,

    /** Default Cosmos DB database name */
    DEFAULT_DATABASE_NAME: 'booking-portal' as const,

    /** Default Cosmos DB container name */
    DEFAULT_CONTAINER: 'bookings' as const,

    /** Knowledge base container name */
    KNOWLEDGE_BASE_CONTAINER: 'knowledge-base' as const
};

/**
 * HTTP Status Codes (for clarity in endpoint code)
 */
export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    PAYLOAD_TOO_LARGE: 413,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500
} as const;

/**
 * Error Messages (centralized for consistency)
 */
export const ERROR_MESSAGES = {
    UNAUTHORIZED: 'Unauthorized',
    INVALID_TOKEN: 'Valid authentication token required',
    FILE_TOO_LARGE: 'File too large. Maximum file size is 10MB.',
    INVALID_FILE_FORMAT: 'Invalid file format. Only PDF files are allowed.',
    NO_FILE_PROVIDED: 'No file provided or invalid file format',
    COSMOS_DB_NOT_CONFIGURED: 'Cosmos DB credentials not configured',
    STORAGE_NOT_CONFIGURED: 'Storage Account not configured',
    ANTHROPIC_KEY_NOT_CONFIGURED: 'ANTHROPIC_API_KEY not configured',
    DOCUMENT_NOT_FOUND: 'Document not found',
    RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later.',
    INTERNAL_SERVER_ERROR: 'Internal server error'
} as const;

/**
 * Validation Configuration
 */
export const VALIDATION_CONFIG = {
    /** Minimum confidence score to consider extraction valid */
    MIN_CONFIDENCE_SCORE: 0.5,

    /** Maximum number of uncertain fields before flagging for review */
    MAX_UNCERTAIN_FIELDS: 5
};

/**
 * Rate Limiting Configuration
 *
 * Prevents DoS attacks and controls API costs by limiting request frequency.
 * Uses sliding window algorithm for accurate rate limiting.
 */
export const RATE_LIMIT_CONFIG = {
    /**
     * Upload endpoint limits (most expensive - uses Claude API)
     * 10 requests per hour per user (prevents Claude API abuse)
     */
    UPLOAD: {
        MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX_REQUESTS || '10'),
        WINDOW_MS: parseInt(process.env.RATE_LIMIT_UPLOAD_WINDOW_MS || '3600000') // 1 hour
    },

    /**
     * Read endpoint limits (moderate cost - Cosmos DB queries)
     * 100 requests per minute per user
     */
    READ: {
        MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_READ_MAX_REQUESTS || '100'),
        WINDOW_MS: parseInt(process.env.RATE_LIMIT_READ_WINDOW_MS || '60000') // 1 minute
    },

    /**
     * Update/Delete endpoint limits (moderate cost - writes to Cosmos DB)
     * 30 requests per minute per user
     */
    WRITE: {
        MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_WRITE_MAX_REQUESTS || '30'),
        WINDOW_MS: parseInt(process.env.RATE_LIMIT_WRITE_WINDOW_MS || '60000') // 1 minute
    },

    /**
     * Admin endpoints (highest privilege)
     * 50 requests per minute
     */
    ADMIN: {
        MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_ADMIN_MAX_REQUESTS || '50'),
        WINDOW_MS: parseInt(process.env.RATE_LIMIT_ADMIN_WINDOW_MS || '60000') // 1 minute
    },

    /** Enable rate limiting globally (can be disabled for testing) */
    ENABLED: process.env.RATE_LIMIT_ENABLED !== 'false'
};
