"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsrApiClient = void 0;
const Axios = __importStar(require("axios"));
const axios = Axios.default;
const retry_1 = require("./utils/retry");
const interceptors_1 = require("./utils/interceptors");
const members_1 = require("./endpoints/members");
const legalEntities_1 = require("./endpoints/legalEntities");
const contacts_1 = require("./endpoints/contacts");
const identifiers_1 = require("./endpoints/identifiers");
const endpoints_1 = require("./endpoints/endpoints");
const audit_1 = require("./endpoints/audit");
const orchestrations_1 = require("./endpoints/orchestrations");
const auth_1 = require("./endpoints/auth");
/**
 * CTN Association Register API Client
 *
 * Provides type-safe access to the ASR API with automatic authentication,
 * retry logic, and error handling.
 *
 * @example
 * ```typescript
 * const client = new AsrApiClient({
 *   baseURL: 'https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1',
 *   getAccessToken: async () => {
 *     const response = await msalInstance.acquireTokenSilent({...});
 *     return response.accessToken;
 *   }
 * });
 *
 * // Get all members
 * const members = await client.members.getAll();
 *
 * // Create a contact
 * const contact = await client.contacts.create(legalEntityId, {
 *   email: 'john@example.com',
 *   name: 'John Doe',
 *   type: 'PRIMARY'
 * });
 * ```
 */
class AsrApiClient {
    constructor(config) {
        // Validate configuration
        if (!config.baseURL) {
            throw new Error('baseURL is required in ApiClientConfig');
        }
        if (!config.getAccessToken) {
            throw new Error('getAccessToken is required in ApiClientConfig');
        }
        // Create axios instance
        this.axiosInstance = axios.create({
            baseURL: config.baseURL,
            timeout: config.timeout || 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        // Configure retry logic
        (0, retry_1.configureRetry)(this.axiosInstance, config.retryAttempts);
        // Configure interceptors (auth & error handling)
        (0, interceptors_1.configureInterceptors)(this.axiosInstance, config.getAccessToken, config.onError);
        // Initialize endpoints
        this.members = new members_1.MembersEndpoint(this.axiosInstance);
        this.legalEntities = new legalEntities_1.LegalEntitiesEndpoint(this.axiosInstance);
        this.contacts = new contacts_1.ContactsEndpoint(this.axiosInstance);
        this.identifiers = new identifiers_1.IdentifiersEndpoint(this.axiosInstance);
        this.endpoints = new endpoints_1.EndpointsEndpoint(this.axiosInstance);
        this.auditLogs = new audit_1.AuditLogsEndpoint(this.axiosInstance);
        this.orchestrations = new orchestrations_1.OrchestrationsEndpoint(this.axiosInstance);
        this.auth = new auth_1.AuthEndpoint(this.axiosInstance);
    }
    /**
     * Get raw axios instance for custom requests
     *
     * Use this when you need to make requests not covered by the typed endpoints.
     * The instance is pre-configured with authentication and error handling.
     *
     * @example
     * ```typescript
     * const response = await client.axios.get('/custom-endpoint');
     * ```
     */
    get axios() {
        return this.axiosInstance;
    }
}
exports.AsrApiClient = AsrApiClient;
