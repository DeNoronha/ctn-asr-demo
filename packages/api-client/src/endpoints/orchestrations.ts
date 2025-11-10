import axiosLib from 'axios';
import type { Orchestration, CreateOrchestrationRequest, PaginatedResponse, PaginationParams } from '../types';

export class OrchestrationsEndpoint {
  constructor(private axios: ReturnType<typeof axiosLib.create>) {}

  /**
   * Get all orchestrations
   */
  async getAll(params?: PaginationParams): Promise<PaginatedResponse<Orchestration>> {
    const { data } = await this.axios.get<PaginatedResponse<Orchestration>>('/orchestrations', { params });
    return data;
  }

  /**
   * Get orchestration by ID
   */
  async getById(id: string): Promise<Orchestration> {
    const { data } = await this.axios.get<Orchestration>(`/orchestrations/${id}`);
    return data;
  }

  /**
   * Create new orchestration
   */
  async create(orchestration: CreateOrchestrationRequest): Promise<Orchestration> {
    const { data } = await this.axios.post<Orchestration>('/orchestrations', orchestration);
    return data;
  }

  /**
   * Get orchestrations by party
   */
  async getByParty(partyId: string, params?: PaginationParams): Promise<PaginatedResponse<Orchestration>> {
    const { data } = await this.axios.get<PaginatedResponse<Orchestration>>('/orchestrations', {
      params: {
        ...params,
        party_id: partyId
      }
    });
    return data;
  }
}
