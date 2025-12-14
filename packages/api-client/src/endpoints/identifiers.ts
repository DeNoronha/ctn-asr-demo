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
   * Get identifier by ID (uses simplified path - identifier ID is globally unique)
   */
  async getById(identifierId: string): Promise<Identifier> {
    const { data } = await this.axios.get<Identifier>(`/identifiers/${identifierId}`);
    return data;
  }

  /**
   * Create identifier for legal entity
   */
  async create(legalEntityId: string, identifier: CreateIdentifierRequest): Promise<Identifier> {
    const { data } = await this.axios.post<Identifier>(`/entities/${legalEntityId}/identifiers`, identifier);
    return data;
  }

  /**
   * Update identifier (uses simplified path - identifier ID is globally unique)
   */
  async update(identifierId: string, updates: UpdateIdentifierRequest): Promise<Identifier> {
    const { data } = await this.axios.put<Identifier>(`/identifiers/${identifierId}`, updates);
    return data;
  }

  /**
   * Delete identifier (uses simplified path - identifier ID is globally unique)
   */
  async delete(identifierId: string): Promise<void> {
    await this.axios.delete(`/identifiers/${identifierId}`);
  }

  /**
   * Validate identifier format and optionally against registry
   */
  async validate(identifierId: string): Promise<{ valid: boolean; details?: { validation_method: string; validated_at: string } }> {
    const { data } = await this.axios.post<{ valid: boolean; details?: { validation_method: string; validated_at: string } }>(`/identifiers/${identifierId}/validate`);
    return data;
  }
}
