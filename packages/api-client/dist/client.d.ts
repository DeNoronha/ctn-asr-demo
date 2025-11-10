import { ApiClientConfig } from './types';
import { MembersEndpoint } from './endpoints/members';
import { LegalEntitiesEndpoint } from './endpoints/legalEntities';
import { ContactsEndpoint } from './endpoints/contacts';
import { IdentifiersEndpoint } from './endpoints/identifiers';
import { EndpointsEndpoint } from './endpoints/endpoints';
import { AuditLogsEndpoint } from './endpoints/audit';
import { OrchestrationsEndpoint } from './endpoints/orchestrations';
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
export declare class AsrApiClient {
    private axiosInstance;
    members: MembersEndpoint;
    legalEntities: LegalEntitiesEndpoint;
    contacts: ContactsEndpoint;
    identifiers: IdentifiersEndpoint;
    endpoints: EndpointsEndpoint;
    auditLogs: AuditLogsEndpoint;
    orchestrations: OrchestrationsEndpoint;
    auth: AuthEndpoint;
    constructor(config: ApiClientConfig);
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
    get axios(): Axios.AxiosInstance;
}
//# sourceMappingURL=client.d.ts.map