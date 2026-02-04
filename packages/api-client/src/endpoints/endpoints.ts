import axiosLib from 'axios';
import type {
  Endpoint,
  CreateEndpointRequest,
  UpdateEndpointRequest,
  InitiateEndpointRegistrationRequest,
  VerifyTokenRequest,
  EndpointTestResult
} from '../types';

export class EndpointsEndpoint {
  constructor(private axios: ReturnType<typeof axiosLib.create>) {}

  /**
   * Get endpoints for a legal entity
   */
  async getByLegalEntity(legalEntityId: string): Promise<Endpoint[]> {
    const { data } = await this.axios.get<Endpoint[]>(`/legal-entities/${legalEntityId}/endpoints`);
    return data;
  }

  /**
   * Get endpoint by ID (uses simplified path - endpoint ID is globally unique)
   */
  async getById(endpointId: string): Promise<Endpoint> {
    const { data } = await this.axios.get<Endpoint>(`/endpoints/${endpointId}`);
    return data;
  }

  /**
   * Create endpoint for legal entity
   */
  async create(legalEntityId: string, endpoint: CreateEndpointRequest): Promise<Endpoint> {
    const { data } = await this.axios.post<Endpoint>(`/legal-entities/${legalEntityId}/endpoints`, endpoint);
    return data;
  }

  /**
   * Update endpoint (uses simplified path - endpoint ID is globally unique)
   */
  async update(endpointId: string, updates: UpdateEndpointRequest): Promise<Endpoint> {
    const { data } = await this.axios.put<Endpoint>(`/endpoints/${endpointId}`, updates);
    return data;
  }

  /**
   * Delete endpoint (uses simplified path - endpoint ID is globally unique)
   */
  async delete(endpointId: string): Promise<void> {
    await this.axios.delete(`/endpoints/${endpointId}`);
  }

  /**
   * Test endpoint connectivity (uses simplified path - endpoint ID is globally unique)
   */
  async test(endpointId: string): Promise<{ success: boolean; message: string }> {
    const { data } = await this.axios.post<{ success: boolean; message: string }>(`/endpoints/${endpointId}/test`);
    return data;
  }

  /**
   * Toggle endpoint active status
   */
  async toggle(endpointId: string, isActive: boolean): Promise<Endpoint> {
    const { data } = await this.axios.patch<Endpoint>(`/endpoints/${endpointId}/toggle`, { is_active: isActive });
    return data;
  }

  /**
   * Step 1: Initiate endpoint registration with verification token
   */
  async initiateRegistration(legalEntityId: string, request: InitiateEndpointRegistrationRequest): Promise<Endpoint> {
    const { data } = await this.axios.post<Endpoint>(`/entities/${legalEntityId}/endpoints/register`, request);
    return data;
  }

  /**
   * Step 2: Verify endpoint via callback challenge-response
   *
   * Sends a POST request to the endpoint URL with a challenge.
   * Endpoint must respond with the challenge value to verify ownership.
   *
   * Response on success: { message, verified: true, endpoint }
   * Response on failure: { message, verified: false, error, hint }
   */
  async sendVerificationEmail(endpointId: string): Promise<{
    message: string;
    verified?: boolean;
    endpoint?: Endpoint;
    error?: string;
    hint?: string;
    // Legacy fields (deprecated)
    mock?: boolean;
    token?: string;
    expires_at?: string;
  }> {
    const { data } = await this.axios.post<{
      message: string;
      verified?: boolean;
      endpoint?: Endpoint;
      error?: string;
      hint?: string;
      mock?: boolean;
      token?: string;
      expires_at?: string;
    }>(`/endpoints/${endpointId}/send-verification`);
    return data;
  }

  /**
   * Step 3: Verify the token provided by user
   */
  async verifyToken(endpointId: string, request: VerifyTokenRequest): Promise<{ message: string; endpoint: Endpoint }> {
    const { data } = await this.axios.post<{ message: string; endpoint: Endpoint }>(`/endpoints/${endpointId}/verify-token`, request);
    return data;
  }

  /**
   * Step 4: Test endpoint with mock API call
   */
  async testEndpoint(endpointId: string): Promise<{ message: string; mock: boolean; test_data: EndpointTestResult; endpoint: Endpoint }> {
    const { data } = await this.axios.post<{ message: string; mock: boolean; test_data: EndpointTestResult; endpoint: Endpoint }>(`/endpoints/${endpointId}/test`);
    return data;
  }

  /**
   * Step 5: Activate endpoint (final step)
   */
  async activateEndpoint(endpointId: string): Promise<{ message: string; endpoint: Endpoint }> {
    const { data } = await this.axios.post<{ message: string; endpoint: Endpoint }>(`/endpoints/${endpointId}/activate`);
    return data;
  }
}
