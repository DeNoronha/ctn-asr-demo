// @ts-nocheck
import * as Axios from 'axios';
import { Orchestration, CreateOrchestrationRequest, PaginatedResponse, PaginationParams } from '../types';

export class OrchestrationsEndpoint {
  constructor(private axios: Axios.AxiosInstance) {}

  /**
   * Get all orchestrations
   */
  async getAll(params?: PaginationParams): Promise<PaginatedResponse<Orchestration>> {
    const { data } = await this.axios.get('/orchestrations', { params }) as any;
    return data;
  }

  /**
   * Get orchestration by ID
   */
  async getById(id: string): Promise<Orchestration> {
    const { data } = await this.axios.get(`/orchestrations/${id}`) as any;
    return data;
  }

  /**
   * Create new orchestration
   */
  async create(orchestration: CreateOrchestrationRequest): Promise<Orchestration> {
    const { data } = await this.axios.post('/orchestrations', orchestration) as any;
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
    }) as any;
    return data;
  }
}
