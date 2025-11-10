// @ts-nocheck
import * as Axios from 'axios';
import { Identifier, CreateIdentifierRequest, UpdateIdentifierRequest } from '../types';

export class IdentifiersEndpoint {
  constructor(private axios: Axios.AxiosInstance) {}

  /**
   * Get identifiers for a legal entity
   */
  async getByLegalEntity(legalEntityId: string): Promise<Identifier[]> {
    const { data } = await this.axios.get(`/legal-entities/${legalEntityId}/identifiers`)) as any;
    return data as any;
  }

  /**
   * Get identifier by ID
   */
  async getById(legalEntityId: string, identifierId: string): Promise<Identifier> {
    const { data } = await this.axios.get(`/legal-entities/${legalEntityId}/identifiers/${identifierId}`)) as any;
    return data as any;
  }

  /**
   * Create identifier for legal entity
   */
  async create(legalEntityId: string, identifier: CreateIdentifierRequest): Promise<Identifier> {
    const { data } = await this.axios.post(`/legal-entities/${legalEntityId}/identifiers`, identifier)) as any;
    return data as any;
  }

  /**
   * Update identifier
   */
  async update(legalEntityId: string, identifierId: string, updates: UpdateIdentifierRequest): Promise<Identifier> {
    const { data } = await this.axios.put(`/legal-entities/${legalEntityId}/identifiers/${identifierId}`, updates)) as any;
    return data as any;
  }

  /**
   * Delete identifier
   */
  async delete(legalEntityId: string, identifierId: string): Promise<void> {
    await this.axios.delete(`/legal-entities/${legalEntityId}/identifiers/${identifierId}`);
  }
}
