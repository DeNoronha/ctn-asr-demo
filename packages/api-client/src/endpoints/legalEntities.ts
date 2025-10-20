import { AxiosInstance } from 'axios';
import { LegalEntity, UpdateLegalEntityRequest, PaginatedResponse } from '../types';

export class LegalEntitiesEndpoint {
  constructor(private axios: AxiosInstance) {}

  /**
   * Get all legal entities
   */
  async getAll(): Promise<PaginatedResponse<LegalEntity>> {
    const { data } = await this.axios.get('/legal-entities');
    return data;
  }

  /**
   * Get legal entity by ID
   */
  async getById(id: string): Promise<LegalEntity> {
    const { data } = await this.axios.get(`/legal-entities/${id}`);
    return data;
  }

  /**
   * Update legal entity
   */
  async update(id: string, updates: UpdateLegalEntityRequest): Promise<LegalEntity> {
    const { data } = await this.axios.put(`/legal-entities/${id}`, updates);
    return data;
  }
}
