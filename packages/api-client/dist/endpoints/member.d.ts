import type axiosLib from "axios";
import type { Contact, ContactRequest, Endpoint, UpdateContactRequest } from "../types";
/**
 * Member Self-Service Endpoint
 *
 * Provides authenticated member-specific operations for the current user's organization.
 * These endpoints operate on the authenticated user's legal entity without requiring explicit IDs.
 */
export declare class MemberEndpoint {
    private axios;
    constructor(axios: ReturnType<typeof axiosLib.create>);
    /**
     * Get current member's profile
     */
    getProfile(): Promise<any>;
    /**
     * Update current member's profile
     */
    updateProfile(updates: Record<string, any>): Promise<void>;
    /**
     * Get current member's contacts
     */
    getContacts(): Promise<any>;
    /**
     * Create contact for current member
     */
    createContact(contact: ContactRequest): Promise<Contact>;
    /**
     * Update contact for current member
     */
    updateContact(contactId: string, updates: UpdateContactRequest): Promise<Contact>;
    /**
     * Get current member's endpoints
     */
    getEndpoints(): Promise<any>;
    /**
     * Create endpoint for current member
     */
    createEndpoint(endpoint: any): Promise<Endpoint>;
    /**
     * Update endpoint for current member
     */
    updateEndpoint(endpointId: string, updates: any): Promise<Endpoint>;
    /**
     * Delete endpoint for current member
     */
    deleteEndpoint(endpointId: string): Promise<void>;
    /**
     * Get current member's API tokens
     */
    getTokens(): Promise<any>;
    /**
     * Create API token for current member
     */
    createToken(tokenData: any): Promise<any>;
    /**
     * Revoke API token
     */
    revokeToken(tokenId: string): Promise<void>;
    /**
     * Get authentication tier information for a legal entity
     */
    getTierInfo(legalEntityId: string): Promise<any>;
    /**
     * Get DNS verification tokens for a legal entity
     */
    getDnsTokens(legalEntityId: string): Promise<any>;
    /**
     * Generate DNS verification token for a legal entity
     */
    generateDnsToken(legalEntityId: string, domain: string): Promise<any>;
    /**
     * Verify DNS token
     */
    verifyDnsToken(tokenId: string): Promise<any>;
    /**
     * Get M2M clients for a legal entity
     */
    getM2MClients(legalEntityId: string): Promise<any>;
    /**
     * Create M2M client for a legal entity
     */
    createM2MClient(legalEntityId: string, clientData: any): Promise<any>;
    /**
     * Delete M2M client
     */
    deleteM2MClient(clientId: string): Promise<void>;
    /**
     * Generate secret for M2M client
     */
    generateM2MClientSecret(clientId: string): Promise<any>;
    /**
     * Get KvK verification status for a legal entity
     */
    getKvkVerificationStatus(legalEntityId: string): Promise<any>;
    /**
     * Upload KvK document for a legal entity
     */
    uploadKvkDocument(legalEntityId: string, file: File): Promise<any>;
    /**
     * Get identifiers for a legal entity
     */
    getIdentifiers(legalEntityId: string): Promise<any>;
    /**
     * Create identifier for a legal entity
     */
    createIdentifier(legalEntityId: string, identifier: any): Promise<any>;
    /**
     * Update identifier
     */
    updateIdentifier(legalEntityId: string, identifierId: string, updates: any): Promise<any>;
    /**
     * Delete identifier
     */
    deleteIdentifier(legalEntityId: string, identifierId: string): Promise<void>;
}
//# sourceMappingURL=member.d.ts.map