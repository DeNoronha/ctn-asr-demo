// @ts-nocheck
import { LegalEntity, UpdateLegalEntityRequest, PaginatedResponse } from '../types';

export class LegalEntitiesEndpoint {
  constructor(private axios: any) {}

  /**
   * Get all legal entities
   */
  async getAll(): Promise<PaginatedResponse<LegalEntity>> {
    const { data } = await this.axios.get('/legal-entities') as any;
    return data as any;
  }

  /**
   * Get legal entity by ID
   */
  async getById(id: string): Promise<LegalEntity> {
    const { data } = await this.axios.get(`/legal-entities/${id}`) as any;
    return data as any;
  }

  /**
   * Update legal entity
   */
  async update(id: string, updates: UpdateLegalEntityRequest): Promise<LegalEntity> {
    const { data } = await this.axios.put(`/legal-entities/${id}`, updates) as any;
    return data as any;
  }
}
