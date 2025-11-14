import axiosLib from 'axios';
import type { Contact, ContactRequest, UpdateContactRequest, Endpoint } from '../types';

/**
 * Member Self-Service Endpoint
 *
 * Provides authenticated member-specific operations for the current user's organization.
 * These endpoints operate on the authenticated user's legal entity without requiring explicit IDs.
 */
export class MemberEndpoint {
  constructor(private axios: ReturnType<typeof axiosLib.create>) {}

  /**
   * Get current member's profile
   */
  async getProfile(): Promise<any> {
    const { data } = await this.axios.get('/member/profile');
    return data;
  }

  /**
   * Update current member's profile
   */
  async updateProfile(updates: Record<string, any>): Promise<void> {
    await this.axios.put('/member/profile', updates);
  }

  /**
   * Get current member's contacts
   */
  async getContacts(): Promise<any> {
    const { data } = await this.axios.get('/member-contacts');
    return data;
  }

  /**
   * Create contact for current member
   */
  async createContact(contact: ContactRequest): Promise<Contact> {
    const { data } = await this.axios.post<Contact>('/member/contacts', contact);
    return data;
  }

  /**
   * Update contact for current member
   */
  async updateContact(contactId: string, updates: UpdateContactRequest): Promise<Contact> {
    const { data } = await this.axios.put<Contact>(`/member/contacts/${contactId}`, updates);
    return data;
  }

  /**
   * Get current member's endpoints
   */
  async getEndpoints(): Promise<any> {
    const { data } = await this.axios.get('/member-endpoints');
    return data;
  }

  /**
   * Create endpoint for current member
   */
  async createEndpoint(endpoint: any): Promise<Endpoint> {
    const { data } = await this.axios.post<Endpoint>('/member/endpoints', endpoint);
    return data;
  }

  /**
   * Update endpoint for current member
   */
  async updateEndpoint(endpointId: string, updates: any): Promise<Endpoint> {
    const { data } = await this.axios.put<Endpoint>(`/member/endpoints/${endpointId}`, updates);
    return data;
  }

  /**
   * Delete endpoint for current member
   */
  async deleteEndpoint(endpointId: string): Promise<void> {
    await this.axios.delete(`/member/endpoints/${endpointId}`);
  }

  /**
   * Get current member's API tokens
   */
  async getTokens(): Promise<any> {
    const { data } = await this.axios.get('/member/tokens');
    return data;
  }

  /**
   * Create API token for current member
   */
  async createToken(tokenData: any): Promise<any> {
    const { data } = await this.axios.post('/member/tokens', tokenData);
    return data;
  }

  /**
   * Revoke API token
   */
  async revokeToken(tokenId: string): Promise<void> {
    await this.axios.delete(`/member/tokens/${tokenId}`);
  }

  /**
   * Get authentication tier information for a legal entity
   */
  async getTierInfo(legalEntityId: string): Promise<any> {
    const { data } = await this.axios.get(`/entities/${legalEntityId}/tier`);
    return data;
  }

  /**
   * Get DNS verification records for current member
   */
  async getDnsVerification(): Promise<any> {
    const { data } = await this.axios.get('/member/dns-verification');
    return data;
  }

  /**
   * Verify DNS records for current member
   */
  async verifyDns(): Promise<any> {
    const { data } = await this.axios.post('/member/dns-verification/verify', {});
    return data;
  }

  /**
   * Get M2M clients for current member
   */
  async getM2MClients(): Promise<any> {
    const { data } = await this.axios.get('/member/m2m-clients');
    return data;
  }

  /**
   * Create M2M client for current member
   */
  async createM2MClient(clientData: any): Promise<any> {
    const { data } = await this.axios.post('/member/m2m-clients', clientData);
    return data;
  }

  /**
   * Delete M2M client
   */
  async deleteM2MClient(clientId: string): Promise<void> {
    await this.axios.delete(`/member/m2m-clients/${clientId}`);
  }

  /**
   * Generate secret for M2M client
   */
  async generateM2MClientSecret(clientId: string): Promise<any> {
    const { data } = await this.axios.post(`/member/m2m-clients/${clientId}/secret`, {});
    return data;
  }
}
