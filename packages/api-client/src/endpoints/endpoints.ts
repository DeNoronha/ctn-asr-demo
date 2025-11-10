import { AxiosInstance } from 'axios';
import {
  Endpoint,
  CreateEndpointRequest,
  UpdateEndpointRequest,
  InitiateEndpointRegistrationRequest,
  VerifyTokenRequest,
  EndpointTestResult
} from '../types';

export class EndpointsEndpoint {
  constructor(private axios: AxiosInstance) {}

  /**
   * Get endpoints for a legal entity
   */
  async getByLegalEntity(legalEntityId: string): Promise<Endpoint[]> {
    const { data } = await this.axios.get(`/legal-entities/${legalEntityId}/endpoints`);
    return data;
  }

  /**
   * Get endpoint by ID
   */
  async getById(legalEntityId: string, endpointId: string): Promise<Endpoint> {
    const { data } = await this.axios.get(`/legal-entities/${legalEntityId}/endpoints/${endpointId}`);
    return data;
  }

  /**
   * Create endpoint for legal entity
   */
  async create(legalEntityId: string, endpoint: CreateEndpointRequest): Promise<Endpoint> {
    const { data } = await this.axios.post(`/legal-entities/${legalEntityId}/endpoints`, endpoint);
    return data;
  }

  /**
   * Update endpoint
   */
  async update(legalEntityId: string, endpointId: string, updates: UpdateEndpointRequest): Promise<Endpoint> {
    const { data } = await this.axios.put(`/legal-entities/${legalEntityId}/endpoints/${endpointId}`, updates);
    return data;
  }

  /**
   * Delete endpoint
   */
  async delete(legalEntityId: string, endpointId: string): Promise<void> {
    await this.axios.delete(`/legal-entities/${legalEntityId}/endpoints/${endpointId}`);
  }

  /**
   * Test endpoint connectivity
   */
  async test(legalEntityId: string, endpointId: string): Promise<{ success: boolean; message: string }> {
    const { data } = await this.axios.post(`/legal-entities/${legalEntityId}/endpoints/${endpointId}/test`);
    return data;
  }

  /**
   * Step 1: Initiate endpoint registration with verification token
   */
  async initiateRegistration(legalEntityId: string, request: InitiateEndpointRegistrationRequest): Promise<Endpoint> {
    const { data } = await this.axios.post(`/entities/${legalEntityId}/endpoints/register`, request);
    return data;
  }

  /**
   * Step 2: Send verification email (mock in development)
   */
  async sendVerificationEmail(endpointId: string): Promise<{ message: string; mock: boolean; token?: string; expires_at?: string }> {
    const { data } = await this.axios.post(`/endpoints/${endpointId}/send-verification`);
    return data;
  }

  /**
   * Step 3: Verify the token provided by user
   */
  async verifyToken(endpointId: string, request: VerifyTokenRequest): Promise<{ message: string; endpoint: Endpoint }> {
    const { data } = await this.axios.post(`/endpoints/${endpointId}/verify-token`, request);
    return data;
  }

  /**
   * Step 4: Test endpoint with mock API call
   */
  async testEndpoint(endpointId: string): Promise<{ message: string; mock: boolean; test_data: EndpointTestResult; endpoint: Endpoint }> {
    const { data } = await this.axios.post(`/endpoints/${endpointId}/test`);
    return data;
  }

  /**
   * Step 5: Activate endpoint (final step)
   */
  async activateEndpoint(endpointId: string): Promise<{ message: string; endpoint: Endpoint }> {
    const { data } = await this.axios.post(`/endpoints/${endpointId}/activate`);
    return data;
  }
}
