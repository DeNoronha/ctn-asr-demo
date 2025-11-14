import axios from 'axios';
import { ApiClientConfig } from './types';
import { configureRetry } from './utils/retry';
import { configureInterceptors } from './utils/interceptors';
import { MembersEndpoint } from './endpoints/members';
import { MemberEndpoint } from './endpoints/member';
import { LegalEntitiesEndpoint } from './endpoints/legalEntities';
import { ContactsEndpoint } from './endpoints/contacts';
import { IdentifiersEndpoint } from './endpoints/identifiers';
import { EndpointsEndpoint } from './endpoints/endpoints';
import { AuditLogsEndpoint } from './endpoints/audit';
import { AuthEndpoint } from './endpoints/auth';

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
export class AsrApiClient {
  private axiosInstance: ReturnType<typeof axios.create>;

  // Endpoints
  public members: MembersEndpoint;
  public member: MemberEndpoint;
  public legalEntities: LegalEntitiesEndpoint;
  public contacts: ContactsEndpoint;
  public identifiers: IdentifiersEndpoint;
  public endpoints: EndpointsEndpoint;
  public auditLogs: AuditLogsEndpoint;
  public auth: AuthEndpoint;

  constructor(config: ApiClientConfig) {
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
    configureRetry(this.axiosInstance, config.retryAttempts);

    // Configure interceptors (auth & error handling)
    configureInterceptors(
      this.axiosInstance,
      config.getAccessToken,
      config.onError
    );

    // Initialize endpoints
    this.members = new MembersEndpoint(this.axiosInstance);
    this.member = new MemberEndpoint(this.axiosInstance);
    this.legalEntities = new LegalEntitiesEndpoint(this.axiosInstance);
    this.contacts = new ContactsEndpoint(this.axiosInstance);
    this.identifiers = new IdentifiersEndpoint(this.axiosInstance);
    this.endpoints = new EndpointsEndpoint(this.axiosInstance);
    this.auditLogs = new AuditLogsEndpoint(this.axiosInstance);
    this.auth = new AuthEndpoint(this.axiosInstance);
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
  public get axios(): ReturnType<typeof axios.create> {
    return this.axiosInstance;
  }
}
