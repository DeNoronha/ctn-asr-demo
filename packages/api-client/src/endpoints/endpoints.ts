import { AxiosInstance } from 'axios';
import { Endpoint, CreateEndpointRequest, UpdateEndpointRequest } from '../types';

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
}
