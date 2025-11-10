import axiosLib from 'axios';
import type { LegalEntity, UpdateLegalEntityRequest, PaginatedResponse } from '../types';

export class LegalEntitiesEndpoint {
  constructor(private axios: ReturnType<typeof axiosLib.create>) {}

  /**
   * Get all legal entities
   */
  async getAll(): Promise<PaginatedResponse<LegalEntity>> {
    const { data } = await this.axios.get<PaginatedResponse<LegalEntity>>('/legal-entities');
    return data;
  }

  /**
   * Get legal entity by ID
   */
  async getById(id: string): Promise<LegalEntity> {
    const { data } = await this.axios.get<LegalEntity>(`/legal-entities/${id}`);
    return data;
  }

  /**
   * Update legal entity
   */
  async update(id: string, updates: UpdateLegalEntityRequest): Promise<LegalEntity> {
    const { data } = await this.axios.put<LegalEntity>(`/legal-entities/${id}`, updates);
    return data;
  }
}
