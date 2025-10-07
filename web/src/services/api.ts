import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:7071/api/v1';

export interface Member {
  org_id: string;
  legal_name: string;
  lei?: string;
  kvk?: string;
  domain: string;
  status: string;
  membership_level: string;
  created_at: string;
  metadata?: any;
}

interface MembersResponse {
  data: Member[];
  count: number;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export const api = {
  async getMembers(): Promise<Member[]> {
    const response = await axios.get<MembersResponse>(`${API_BASE_URL}/members`);
    return response.data.data;
  },

  async getMember(orgId: string): Promise<Member> {
    const response = await axios.get<Member>(`${API_BASE_URL}/members/${orgId}`);
    return response.data;
  },

  async createMember(member: Partial<Member>): Promise<Member> {
    const response = await axios.post<Member>(`${API_BASE_URL}/members`, member);
    return response.data;
  },

  async issueToken(orgId: string): Promise<{ access_token: string }> {
    const response = await axios.post<TokenResponse>(`${API_BASE_URL}/oauth/token`, { org_id: orgId });
    return response.data;
  }
};
