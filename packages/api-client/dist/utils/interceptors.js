"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureInterceptors = configureInterceptors;
const error_1 = require("./error");
function configureInterceptors(instance, getAccessToken, onError) {
    // Request interceptor - Add authentication token
    instance.interceptors.request.use(async (config) => {
        try {
            const token = await getAccessToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        catch (error) {
            console.error('Failed to get access token:', error);
            throw error;
        }
        return config;
    }, (error) => {
        return Promise.reject(error);
    });
    // Response interceptor - Handle errors
    instance.interceptors.response.use((response) => response, (error) => {
        const apiError = error_1.AsrApiError.fromAxiosError(error);
        // Call custom error handler if provided
        if (onError) {
            onError(apiError);
        }
        return Promise.reject(apiError);
    });
}
