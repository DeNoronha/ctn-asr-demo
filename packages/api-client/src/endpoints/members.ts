import { AxiosInstance } from 'axios';
import { Member, CreateMemberRequest, UpdateMemberRequest, PaginatedResponse, PaginationParams } from '../types';

export class MembersEndpoint {
  constructor(private axios: AxiosInstance) {}

  /**
   * Get all members (admin only)
   */
  async getAll(params?: PaginationParams): Promise<PaginatedResponse<Member>> {
    const { data } = await this.axios.get('/all-members', { params });
    return data;
  }

  /**
   * Get member by ID
   */
  async getById(id: string): Promise<Member> {
    const { data } = await this.axios.get(`/members/${id}`);
    return data;
  }

  /**
   * Create new member
   */
  async create(member: CreateMemberRequest): Promise<Member> {
    const { data } = await this.axios.post('/members', member);
    return data;
  }

  /**
   * Update member
   */
  async update(id: string, updates: UpdateMemberRequest): Promise<Member> {
    const { data } = await this.axios.put(`/members/${id}`, updates);
    return data;
  }

  /**
   * Delete member
   */
  async delete(id: string): Promise<void> {
    await this.axios.delete(`/members/${id}`);
  }
}
