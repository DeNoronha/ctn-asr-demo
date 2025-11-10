"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureRetry = configureRetry;
const axios_retry_1 = __importDefault(require("axios-retry"));
function configureRetry(instance, retryAttempts = 3) {
    (0, axios_retry_1.default)(instance, {
        retries: retryAttempts,
        retryDelay: axios_retry_1.default.exponentialDelay,
        retryCondition: (error) => {
            // Retry on network errors and 5xx errors
            return axios_retry_1.default.isNetworkOrIdempotentRequestError(error) ||
                (error.response?.status ?? 0) >= 500;
        },
        onRetry: (retryCount, error) => {
            console.warn(`Retry attempt ${retryCount} for ${error.config?.url}`);
        }
    });
}
