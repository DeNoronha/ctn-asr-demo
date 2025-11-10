import axiosLib from 'axios';
/**
 * Configure axios interceptors for authentication and error handling.
 *
 * NOTE: This file uses type assertions due to conflicts between axios type definitions
 * and angular/axios-retry typings in the monorepo. The runtime behavior is correct.
 */
export declare function configureInterceptors(instance: ReturnType<typeof axiosLib.create>, getAccessToken: () => Promise<string> | string, onError?: (error: Error) => void): void;
//# sourceMappingURL=interceptors.d.ts.map