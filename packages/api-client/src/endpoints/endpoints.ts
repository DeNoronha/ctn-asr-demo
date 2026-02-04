import type axiosLib from "axios";
import type {
	ApproveAccessPayload,
	CreateEndpointRequest,
	DenyAccessPayload,
	Endpoint,
	EndpointAccessRequest,
	EndpointConsumerGrant,
	EndpointDirectoryEntry,
	EndpointTestResult,
	InitiateEndpointRegistrationRequest,
	RequestAccessPayload,
	RevokeGrantPayload,
	UpdateEndpointRequest,
	VerifyTokenRequest,
} from "../types";

export class EndpointsEndpoint {
	constructor(private axios: ReturnType<typeof axiosLib.create>) {}

	/**
	 * Get endpoints for a legal entity
	 */
	async getByLegalEntity(legalEntityId: string): Promise<Endpoint[]> {
		const { data } = await this.axios.get<Endpoint[]>(
			`/legal-entities/${legalEntityId}/endpoints`,
		);
		return data;
	}

	/**
	 * Get endpoint by ID (uses simplified path - endpoint ID is globally unique)
	 */
	async getById(endpointId: string): Promise<Endpoint> {
		const { data } = await this.axios.get<Endpoint>(`/endpoints/${endpointId}`);
		return data;
	}

	/**
	 * Create endpoint for legal entity
	 */
	async create(
		legalEntityId: string,
		endpoint: CreateEndpointRequest,
	): Promise<Endpoint> {
		const { data } = await this.axios.post<Endpoint>(
			`/legal-entities/${legalEntityId}/endpoints`,
			endpoint,
		);
		return data;
	}

	/**
	 * Update endpoint (uses simplified path - endpoint ID is globally unique)
	 */
	async update(
		endpointId: string,
		updates: UpdateEndpointRequest,
	): Promise<Endpoint> {
		const { data } = await this.axios.put<Endpoint>(
			`/endpoints/${endpointId}`,
			updates,
		);
		return data;
	}

	/**
	 * Delete endpoint (uses simplified path - endpoint ID is globally unique)
	 */
	async delete(endpointId: string): Promise<void> {
		await this.axios.delete(`/endpoints/${endpointId}`);
	}

	/**
	 * Test endpoint connectivity (uses simplified path - endpoint ID is globally unique)
	 */
	async test(
		endpointId: string,
	): Promise<{ success: boolean; message: string }> {
		const { data } = await this.axios.post<{
			success: boolean;
			message: string;
		}>(`/endpoints/${endpointId}/test`);
		return data;
	}

	/**
	 * Toggle endpoint active status
	 */
	async toggle(endpointId: string, isActive: boolean): Promise<Endpoint> {
		const { data } = await this.axios.patch<Endpoint>(
			`/endpoints/${endpointId}/toggle`,
			{ is_active: isActive },
		);
		return data;
	}

	/**
	 * Step 1: Initiate endpoint registration with verification token
	 */
	async initiateRegistration(
		legalEntityId: string,
		request: InitiateEndpointRegistrationRequest,
	): Promise<Endpoint> {
		const { data } = await this.axios.post<Endpoint>(
			`/entities/${legalEntityId}/endpoints/register`,
			request,
		);
		return data;
	}

	/**
	 * Step 2: Verify endpoint via callback challenge-response
	 *
	 * Sends a POST request to the endpoint URL with a challenge.
	 * Endpoint must respond with the challenge value to verify ownership.
	 *
	 * Response on success: { message, verified: true, endpoint }
	 * Response on failure: { message, verified: false, error, hint }
	 */
	async sendVerificationCallback(endpointId: string): Promise<{
		message: string;
		verified?: boolean;
		endpoint?: Endpoint;
		error?: string;
		hint?: string;
	}> {
		const { data } = await this.axios.post<{
			message: string;
			verified?: boolean;
			endpoint?: Endpoint;
			error?: string;
			hint?: string;
		}>(`/endpoints/${endpointId}/send-verification`);
		return data;
	}

	/**
	 * @deprecated Use sendVerificationCallback instead
	 */
	async sendVerificationEmail(endpointId: string): Promise<{
		message: string;
		verified?: boolean;
		endpoint?: Endpoint;
		error?: string;
		hint?: string;
	}> {
		return this.sendVerificationCallback(endpointId);
	}

	/**
	 * Step 3: Verify the token provided by user
	 */
	async verifyToken(
		endpointId: string,
		request: VerifyTokenRequest,
	): Promise<{ message: string; endpoint: Endpoint }> {
		const { data } = await this.axios.post<{
			message: string;
			endpoint: Endpoint;
		}>(`/endpoints/${endpointId}/verify-token`, request);
		return data;
	}

	/**
	 * Step 4: Test endpoint with mock API call
	 */
	async testEndpoint(
		endpointId: string,
	): Promise<{
		message: string;
		mock: boolean;
		test_data: EndpointTestResult;
		endpoint: Endpoint;
	}> {
		const { data } = await this.axios.post<{
			message: string;
			mock: boolean;
			test_data: EndpointTestResult;
			endpoint: Endpoint;
		}>(`/endpoints/${endpointId}/test`);
		return data;
	}

	/**
	 * Step 5: Activate endpoint (final step)
	 */
	async activateEndpoint(
		endpointId: string,
	): Promise<{ message: string; endpoint: Endpoint }> {
		const { data } = await this.axios.post<{
			message: string;
			endpoint: Endpoint;
		}>(`/endpoints/${endpointId}/activate`);
		return data;
	}

	// ==========================================================================
	// ENDPOINT LIFECYCLE - PUBLICATION (Phase 3)
	// ==========================================================================

	/**
	 * Publish endpoint to CTN directory (makes it discoverable)
	 * Requires endpoint to be VERIFIED
	 */
	async publish(
		endpointId: string,
	): Promise<{ message: string; endpoint: Endpoint }> {
		const { data } = await this.axios.post<{
			message: string;
			endpoint: Endpoint;
		}>(`/endpoints/${endpointId}/publish`);
		return data;
	}

	/**
	 * Unpublish endpoint from CTN directory (removes from discovery)
	 */
	async unpublish(
		endpointId: string,
	): Promise<{ message: string; endpoint: Endpoint }> {
		const { data } = await this.axios.post<{
			message: string;
			endpoint: Endpoint;
		}>(`/endpoints/${endpointId}/unpublish`);
		return data;
	}

	// ==========================================================================
	// ENDPOINT DIRECTORY - CONSUMER DISCOVERY (Phase 4)
	// ==========================================================================

	/**
	 * Get published endpoints for consumer discovery
	 * Excludes consumer's own endpoints
	 */
	async getDirectory(): Promise<EndpointDirectoryEntry[]> {
		const { data } = await this.axios.get<{
			endpoints: EndpointDirectoryEntry[];
		}>("/endpoint-directory");
		return data.endpoints;
	}

	// ==========================================================================
	// ACCESS REQUEST WORKFLOW (Phase 4-5)
	// ==========================================================================

	/**
	 * Consumer requests access to an endpoint
	 * For 'open' endpoints: auto-approved immediately
	 * For 'restricted'/'private': creates pending request
	 */
	async requestAccess(
		endpointId: string,
		payload?: RequestAccessPayload,
	): Promise<{
		message: string;
		status: "approved" | "pending";
		access_request_id?: string;
		access_request?: EndpointAccessRequest;
		grant?: EndpointConsumerGrant;
	}> {
		const { data } = await this.axios.post<{
			message: string;
			status: "approved" | "pending";
			access_request_id?: string;
			access_request?: EndpointAccessRequest;
			grant?: EndpointConsumerGrant;
		}>(`/endpoints/${endpointId}/request-access`, payload || {});
		return data;
	}

	/**
	 * Provider views access requests for their endpoint
	 * @param status Optional filter by status (pending, approved, denied, revoked)
	 */
	async getAccessRequests(
		endpointId: string,
		status?: string,
	): Promise<EndpointAccessRequest[]> {
		const params = status ? { status } : {};
		const { data } = await this.axios.get<{
			access_requests: EndpointAccessRequest[];
		}>(`/endpoints/${endpointId}/access-requests`, { params });
		return data.access_requests;
	}

	/**
	 * Provider approves an access request
	 * Creates a grant for the consumer
	 */
	async approveAccess(
		requestId: string,
		payload?: ApproveAccessPayload,
	): Promise<{
		message: string;
		grant: EndpointConsumerGrant;
	}> {
		const { data } = await this.axios.post<{
			message: string;
			grant: EndpointConsumerGrant;
		}>(`/access-requests/${requestId}/approve`, payload || {});
		return data;
	}

	/**
	 * Provider denies an access request
	 */
	async denyAccess(
		requestId: string,
		payload?: DenyAccessPayload,
	): Promise<{
		message: string;
		access_request: EndpointAccessRequest;
	}> {
		const { data } = await this.axios.post<{
			message: string;
			access_request: EndpointAccessRequest;
		}>(`/access-requests/${requestId}/deny`, payload || {});
		return data;
	}

	// ==========================================================================
	// CONSUMER GRANTS (Phase 6)
	// ==========================================================================

	/**
	 * Consumer views their granted endpoint accesses
	 */
	async getMyGrants(): Promise<EndpointConsumerGrant[]> {
		const { data } = await this.axios.get<{ grants: EndpointConsumerGrant[] }>(
			"/my-access-grants",
		);
		return data.grants;
	}

	/**
	 * Revoke an access grant
	 * Can be done by provider (endpoint owner) or consumer (grant holder)
	 */
	async revokeGrant(
		grantId: string,
		payload?: RevokeGrantPayload,
	): Promise<{
		message: string;
		grant: EndpointConsumerGrant;
	}> {
		const { data } = await this.axios.post<{
			message: string;
			grant: EndpointConsumerGrant;
		}>(`/grants/${grantId}/revoke`, payload || {});
		return data;
	}
}
