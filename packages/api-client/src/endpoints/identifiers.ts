import axiosLib from 'axios';
import type { Identifier, CreateIdentifierRequest, UpdateIdentifierRequest } from '../types';

export class IdentifiersEndpoint {
  constructor(private axios: ReturnType<typeof axiosLib.create>) {}

  /**
   * Get identifiers for a legal entity
   */
  async getByLegalEntity(legalEntityId: string): Promise<Identifier[]> {
    const { data } = await this.axios.get<Identifier[]>(`/legal-entities/${legalEntityId}/identifiers`);
    return data;
  }

  /**
   * Get identifier by ID
   */
  async getById(legalEntityId: string, identifierId: string): Promise<Identifier> {
    const { data } = await this.axios.get<Identifier>(`/legal-entities/${legalEntityId}/identifiers/${identifierId}`);
    return data;
  }

  /**
   * Create identifier for legal entity
   */
  async create(legalEntityId: string, identifier: CreateIdentifierRequest): Promise<Identifier> {
    const { data } = await this.axios.post<Identifier>(`/legal-entities/${legalEntityId}/identifiers`, identifier);
    return data;
  }

  /**
   * Update identifier
   */
  async update(legalEntityId: string, identifierId: string, updates: UpdateIdentifierRequest): Promise<Identifier> {
    const { data } = await this.axios.put<Identifier>(`/legal-entities/${legalEntityId}/identifiers/${identifierId}`, updates);
    return data;
  }

  /**
   * Delete identifier
   */
  async delete(legalEntityId: string, identifierId: string): Promise<void> {
    await this.axios.delete(`/legal-entities/${legalEntityId}/identifiers/${identifierId}`);
  }
}
