import axiosLib from 'axios';
import type { Member, CreateMemberRequest, UpdateMemberRequest, PaginatedResponse, PaginationParams } from '../types';

export class MembersEndpoint {
  constructor(private axios: ReturnType<typeof axiosLib.create>) {}

  /**
   * Get all members (admin only)
   */
  async getAll(params?: PaginationParams): Promise<PaginatedResponse<Member>> {
    const { data } = await this.axios.get<PaginatedResponse<Member>>('/all-members', { params });
    return data;
  }

  /**
   * Get member by ID
   */
  async getById(id: string): Promise<Member> {
    const { data } = await this.axios.get<Member>(`/members/${id}`);
    return data;
  }

  /**
   * Create new member
   */
  async create(member: CreateMemberRequest): Promise<Member> {
    const { data } = await this.axios.post<Member>('/members', member);
    return data;
  }

  /**
   * Update member
   */
  async update(id: string, updates: UpdateMemberRequest): Promise<Member> {
    const { data } = await this.axios.put<Member>(`/members/${id}`, updates);
    return data;
  }

  /**
   * Delete member
   */
  async delete(id: string): Promise<void> {
    await this.axios.delete(`/members/${id}`);
  }
}
