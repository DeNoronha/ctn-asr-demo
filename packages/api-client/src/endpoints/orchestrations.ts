import { AxiosInstance } from 'axios';
import { Orchestration, CreateOrchestrationRequest, PaginatedResponse, PaginationParams } from '../types';

export class OrchestrationsEndpoint {
  constructor(private axios: AxiosInstance) {}

  /**
   * Get all orchestrations
   */
  async getAll(params?: PaginationParams): Promise<PaginatedResponse<Orchestration>> {
    const { data } = await this.axios.get('/orchestrations', { params });
    return data;
  }

  /**
   * Get orchestration by ID
   */
  async getById(id: string): Promise<Orchestration> {
    const { data } = await this.axios.get(`/orchestrations/${id}`);
    return data;
  }

  /**
   * Create new orchestration
   */
  async create(orchestration: CreateOrchestrationRequest): Promise<Orchestration> {
    const { data } = await this.axios.post('/orchestrations', orchestration);
    return data;
  }

  /**
   * Get orchestrations by party
   */
  async getByParty(partyId: string, params?: PaginationParams): Promise<PaginatedResponse<Orchestration>> {
    const { data } = await this.axios.get('/orchestrations', {
      params: {
        ...params,
        party_id: partyId
      }
    });
    return data;
  }
}
