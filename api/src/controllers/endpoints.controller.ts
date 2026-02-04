/**
 * Endpoints Controller
 *
 * Handles endpoint CRUD operations for legal entities.
 * Endpoints represent M2M communication endpoints (REST APIs, webhooks, etc.)
 *
 * Security features:
 * - SSRF protection (SEC-005): URL validation before fetching
 * - IDOR protection (SEC-006): Authorization checks before operations
 *
 * Registration Workflow:
 * 1. initiateRegistration - Create endpoint with PENDING status
 * 2. sendVerificationEmail - Generate token and send email (mock in dev)
 * 3. verifyToken - Validate the token
 * 4. testEndpoint - Test connectivity
 * 5. activateEndpoint - Activate for use
 *
 * @module controllers/endpoints
 */

import { randomBytes, randomUUID } from "crypto";
import type { Request, Response } from "express";
import { invalidateCacheForUser } from "../middleware/cache";
import { getPool } from "../utils/database";

// Token expiry: 24 hours
const TOKEN_EXPIRY_HOURS = 24;

// ============================================================================
// SSRF PROTECTION HELPER
// ============================================================================

/**
 * SSRF protection: Validate URL is safe to fetch (SEC-005)
 * Blocks localhost, private IPs, cloud metadata endpoints
 */
export function isUrlSafeForFetch(urlString: string): {
	safe: boolean;
	reason?: string;
} {
	try {
		const url = new URL(urlString);

		// Only allow HTTP/HTTPS protocols
		if (!["http:", "https:"].includes(url.protocol)) {
			return {
				safe: false,
				reason: "Only HTTP and HTTPS protocols are allowed",
			};
		}

		const hostname = url.hostname.toLowerCase();

		// Block localhost and loopback addresses
		if (
			hostname === "localhost" ||
			hostname === "127.0.0.1" ||
			hostname === "::1"
		) {
			return { safe: false, reason: "Localhost addresses are not allowed" };
		}

		// Block cloud metadata endpoints (AWS, Azure, GCP)
		const metadataEndpoints = [
			"169.254.169.254", // AWS/Azure/GCP metadata
			"metadata.google.internal",
			"metadata.goog",
			"169.254.170.2", // AWS ECS task metadata
		];
		if (metadataEndpoints.includes(hostname)) {
			return {
				safe: false,
				reason: "Cloud metadata endpoints are not allowed",
			};
		}

		// Block private IP ranges (RFC 1918)
		const ipv4Match = hostname.match(
			/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/,
		);
		if (ipv4Match) {
			const [, a, b, c] = ipv4Match.map(Number);

			// 10.0.0.0/8 - Private network
			if (a === 10) {
				return {
					safe: false,
					reason: "Private IP ranges (10.x.x.x) are not allowed",
				};
			}

			// 172.16.0.0/12 - Private network
			if (a === 172 && b >= 16 && b <= 31) {
				return {
					safe: false,
					reason: "Private IP ranges (172.16-31.x.x) are not allowed",
				};
			}

			// 192.168.0.0/16 - Private network
			if (a === 192 && b === 168) {
				return {
					safe: false,
					reason: "Private IP ranges (192.168.x.x) are not allowed",
				};
			}

			// 169.254.0.0/16 - Link-local
			if (a === 169 && b === 254) {
				return {
					safe: false,
					reason: "Link-local addresses (169.254.x.x) are not allowed",
				};
			}

			// 0.0.0.0/8 - Current network
			if (a === 0) {
				return { safe: false, reason: "Invalid IP address" };
			}
		}

		return { safe: true };
	} catch {
		return { safe: false, reason: "Invalid URL format" };
	}
}

// ============================================================================
// ENDPOINTS BY LEGAL ENTITY
// ============================================================================

/**
 * GET /v1/legal-entities/:legalentityid/endpoints
 * Get all endpoints for a legal entity
 */
export async function getEndpointsByLegalEntity(
	req: Request,
	res: Response,
): Promise<void> {
	try {
		const pool = getPool();
		const { legalentityid } = req.params;

		const { rows } = await pool.query(
			`
      SELECT
        legal_entity_endpoint_id,
        legal_entity_id,
        endpoint_name,
        endpoint_url,
        endpoint_description,
        data_category,
        endpoint_type,
        authentication_method,
        last_connection_test,
        last_connection_status,
        is_active,
        activation_date,
        deactivation_date,
        verification_status,
        verification_sent_at,
        verification_expires_at,
        access_model,
        publication_status,
        published_at,
        dt_created,
        dt_modified
      FROM legal_entity_endpoint
      WHERE legal_entity_id = $1 AND is_deleted = false
      ORDER BY endpoint_name ASC
    `,
			[legalentityid],
		);

		res.json({ data: rows });
	} catch (error: any) {
		console.error("Error fetching endpoints:", {
			legalEntityId: req.params.legalentityid,
			error: error.message,
			stack: error.stack,
			detail: error.detail || error.toString(),
		});
		res
			.status(500)
			.json({ error: "Failed to fetch endpoints", detail: error.message });
	}
}

/**
 * POST /v1/legal-entities/:legalentityid/endpoints
 * Create a new endpoint for a legal entity
 */
export async function createEndpointForLegalEntity(
	req: Request,
	res: Response,
): Promise<void> {
	try {
		const pool = getPool();
		const { legalentityid } = req.params;
		const endpointId = randomUUID();

		const {
			endpoint_type,
			endpoint_url,
			endpoint_name,
			is_active,
			authentication_method,
		} = req.body;

		if (!endpoint_url || !endpoint_name) {
			res
				.status(400)
				.json({ error: "endpoint_url and endpoint_name are required" });
			return;
		}

		const { rows } = await pool.query(
			`
      INSERT INTO legal_entity_endpoint (
        legal_entity_endpoint_id, legal_entity_id, endpoint_type, endpoint_url,
        endpoint_name, is_active, authentication_method,
        dt_created, dt_modified
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `,
			[
				endpointId,
				legalentityid,
				endpoint_type || "REST_API",
				endpoint_url,
				endpoint_name,
				is_active !== false,
				authentication_method,
			],
		);

		// Invalidate endpoints cache
		invalidateCacheForUser(
			req,
			`/v1/legal-entities/${legalentityid}/endpoints`,
		);
		invalidateCacheForUser(req, `/v1/member-endpoints`);

		res.status(201).json(rows[0]);
	} catch (error: any) {
		console.error("Error creating endpoint:", error);
		res.status(500).json({ error: "Failed to create endpoint" });
	}
}

// ============================================================================
// STANDALONE ENDPOINT OPERATIONS
// ============================================================================

/**
 * PUT /v1/endpoints/:endpointId
 * Update an endpoint
 */
export async function updateEndpoint(
	req: Request,
	res: Response,
): Promise<void> {
	try {
		const pool = getPool();
		const { endpointId } = req.params;

		const {
			endpoint_type,
			endpoint_url,
			endpoint_name,
			is_active,
			authentication_method,
		} = req.body;

		const { rows } = await pool.query(
			`
      UPDATE legal_entity_endpoint SET
        endpoint_type = COALESCE($1, endpoint_type),
        endpoint_url = COALESCE($2, endpoint_url),
        endpoint_name = COALESCE($3, endpoint_name),
        is_active = COALESCE($4, is_active),
        authentication_method = COALESCE($5, authentication_method),
        dt_modified = NOW()
      WHERE legal_entity_endpoint_id = $6 AND is_deleted = false
      RETURNING *
    `,
			[
				endpoint_type,
				endpoint_url,
				endpoint_name,
				is_active,
				authentication_method,
				endpointId,
			],
		);

		if (rows.length === 0) {
			res.status(404).json({ error: "Endpoint not found" });
			return;
		}

		// Invalidate endpoints cache for this legal entity
		const legalEntityId = rows[0].legal_entity_id;
		invalidateCacheForUser(
			req,
			`/v1/legal-entities/${legalEntityId}/endpoints`,
		);
		invalidateCacheForUser(req, `/v1/member-endpoints`);

		res.json(rows[0]);
	} catch (error: any) {
		console.error("Error updating endpoint:", error);
		res.status(500).json({ error: "Failed to update endpoint" });
	}
}

/**
 * DELETE /v1/endpoints/:endpointId
 * Soft-delete an endpoint
 */
export async function deleteEndpoint(
	req: Request,
	res: Response,
): Promise<void> {
	try {
		const pool = getPool();
		const { endpointId } = req.params;

		const { rows, rowCount } = await pool.query(
			`
      UPDATE legal_entity_endpoint SET is_deleted = true, dt_modified = NOW()
      WHERE legal_entity_endpoint_id = $1 AND is_deleted = false
      RETURNING legal_entity_id
    `,
			[endpointId],
		);

		if (rowCount === 0) {
			res.status(404).json({ error: "Endpoint not found" });
			return;
		}

		// Invalidate endpoints cache for this legal entity
		const legalEntityId = rows[0].legal_entity_id;
		invalidateCacheForUser(
			req,
			`/v1/legal-entities/${legalEntityId}/endpoints`,
		);
		invalidateCacheForUser(req, `/v1/member-endpoints`);

		res.status(204).send();
	} catch (error: any) {
		console.error("Error deleting endpoint:", error);
		res.status(500).json({ error: "Failed to delete endpoint" });
	}
}

/**
 * POST /v1/endpoints/:endpointId/test
 * Test endpoint connection
 * Includes SSRF protection (SEC-005) and IDOR protection (SEC-006)
 */
export async function testEndpoint(req: Request, res: Response): Promise<void> {
	try {
		const pool = getPool();
		const { endpointId } = req.params;

		// Get the endpoint
		const { rows, rowCount } = await pool.query(
			`
      SELECT legal_entity_endpoint_id, endpoint_url, endpoint_name, authentication_method, legal_entity_id
      FROM legal_entity_endpoint
      WHERE legal_entity_endpoint_id = $1 AND is_deleted = false
    `,
			[endpointId],
		);

		if (rowCount === 0) {
			res.status(404).json({ error: "Endpoint not found" });
			return;
		}

		const endpoint = rows[0];

		// IDOR protection: Verify user has access to this endpoint's legal entity (SEC-006)
		const userEmail = (req as any).userEmail;
		const userRoles = (req as any).userRoles || [];

		// SystemAdmin and AssociationAdmin can test any endpoint
		const isAdmin =
			userRoles.includes("SystemAdmin") ||
			userRoles.includes("AssociationAdmin");

		if (!isAdmin) {
			// Check if user's party owns this endpoint
			const { rows: partyRows } = await pool.query(
				`
        SELECT 1 FROM legal_entity le
        JOIN legal_entity_contact lec ON lec.legal_entity_id = le.legal_entity_id
        WHERE le.legal_entity_id = $1
          AND lec.email = $2
          AND lec.is_active = true
          AND le.is_deleted = false
      `,
				[endpoint.legal_entity_id, userEmail],
			);

			if (partyRows.length === 0) {
				// Return 404 to prevent information disclosure (don't reveal endpoint exists)
				res.status(404).json({ error: "Endpoint not found" });
				return;
			}
		}

		const testStartTime = Date.now();
		let success = false;
		let statusCode: number | undefined;
		let errorMessage: string | undefined;

		// Attempt to test connection if URL exists
		if (endpoint.endpoint_url) {
			// SSRF protection: Validate URL before fetching (SEC-005)
			const urlValidation = isUrlSafeForFetch(endpoint.endpoint_url);
			if (!urlValidation.safe) {
				errorMessage = `URL blocked: ${urlValidation.reason}`;
			} else {
				try {
					const controller = new AbortController();
					const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

					const response = await fetch(endpoint.endpoint_url, {
						method: "HEAD",
						signal: controller.signal,
						redirect: "manual", // Don't follow redirects automatically (SSRF protection)
					});
					clearTimeout(timeout);

					statusCode = response.status;
					// Consider redirect as partial success - URL is reachable but redirects
					if (response.status >= 300 && response.status < 400) {
						success = true;
						errorMessage = `Endpoint redirects to: ${response.headers.get("location") || "unknown"}`;
					} else {
						success = response.ok;
					}
				} catch (fetchError: any) {
					errorMessage =
						fetchError.name === "AbortError"
							? "Connection timeout (10s)"
							: fetchError.message || "Connection failed";
				}
			}
		} else {
			errorMessage = "No endpoint URL configured";
		}

		const responseTime = Date.now() - testStartTime;

		const testData = {
			success,
			response_time_ms: responseTime,
			test_result: success ? "PASSED" : "FAILED",
			status_code: statusCode,
			error_message: errorMessage,
			tested_at: new Date().toISOString(),
		};

		// Update the endpoint with test results
		const { rows: updatedRows } = await pool.query(
			`
      UPDATE legal_entity_endpoint
      SET last_connection_test = NOW(),
          last_connection_status = $2,
          connection_test_details = $3,
          test_result_data = $3,
          dt_modified = NOW()
      WHERE legal_entity_endpoint_id = $1
      RETURNING *
    `,
			[endpointId, success ? "SUCCESS" : "FAILED", JSON.stringify(testData)],
		);

		const isMockMode = process.env.NODE_ENV !== "production";

		// Response format supports both legacy and registration wizard formats
		res.json({
			success,
			message: success
				? "Connection successful"
				: errorMessage || "Connection failed",
			mock: isMockMode,
			// Legacy format (backward compatibility)
			details: testData,
			// Registration wizard format
			test_data: testData,
			endpoint: updatedRows[0],
		});
	} catch (error: any) {
		console.error("Error testing endpoint:", error);
		res.status(500).json({ error: "Failed to test endpoint connection" });
	}
}

/**
 * PATCH /v1/endpoints/:endpointId/toggle
 * Toggle endpoint active status
 * Includes IDOR protection (SEC-006)
 */
export async function toggleEndpoint(
	req: Request,
	res: Response,
): Promise<void> {
	try {
		const pool = getPool();
		const { endpointId } = req.params;
		const { is_active } = req.body;

		if (typeof is_active !== "boolean") {
			res.status(400).json({ error: "is_active must be a boolean" });
			return;
		}

		// First, get the endpoint to check authorization (SEC-006)
		const { rows: endpointRows, rowCount: endpointCount } = await pool.query(
			`
      SELECT legal_entity_endpoint_id, legal_entity_id
      FROM legal_entity_endpoint
      WHERE legal_entity_endpoint_id = $1 AND is_deleted = false
    `,
			[endpointId],
		);

		if (endpointCount === 0) {
			res.status(404).json({ error: "Endpoint not found" });
			return;
		}

		const endpoint = endpointRows[0];

		// IDOR protection: Verify user has access to this endpoint's legal entity (SEC-006)
		const userEmail = (req as any).userEmail;
		const userRoles = (req as any).userRoles || [];

		// SystemAdmin and AssociationAdmin can toggle any endpoint
		const isAdmin =
			userRoles.includes("SystemAdmin") ||
			userRoles.includes("AssociationAdmin");

		if (!isAdmin) {
			// Check if user's party owns this endpoint
			const { rows: partyRows } = await pool.query(
				`
        SELECT 1 FROM legal_entity le
        JOIN legal_entity_contact lec ON lec.legal_entity_id = le.legal_entity_id
        WHERE le.legal_entity_id = $1
          AND lec.email = $2
          AND lec.is_active = true
          AND le.is_deleted = false
      `,
				[endpoint.legal_entity_id, userEmail],
			);

			if (partyRows.length === 0) {
				// Return 404 to prevent information disclosure (don't reveal endpoint exists)
				res.status(404).json({ error: "Endpoint not found" });
				return;
			}
		}

		// Now perform the update
		const { rows, rowCount } = await pool.query(
			`
      UPDATE legal_entity_endpoint
      SET is_active = $2,
          activation_date = CASE WHEN $2 = true THEN NOW() ELSE activation_date END,
          deactivation_date = CASE WHEN $2 = false THEN NOW() ELSE NULL END,
          dt_modified = NOW()
      WHERE legal_entity_endpoint_id = $1 AND is_deleted = false
      RETURNING *
    `,
			[endpointId, is_active],
		);

		if (rowCount === 0) {
			res.status(404).json({ error: "Endpoint not found" });
			return;
		}

		// Invalidate cache
		invalidateCacheForUser(
			req,
			`/v1/legal-entities/${rows[0].legal_entity_id}/endpoints`,
		);
		invalidateCacheForUser(req, `/v1/member-endpoints`);

		res.json(rows[0]);
	} catch (error: any) {
		console.error("Error toggling endpoint:", error);
		res.status(500).json({ error: "Failed to toggle endpoint status" });
	}
}

// ============================================================================
// MEMBER ENDPOINTS (Self-service)
// ============================================================================

/**
 * GET /v1/member-endpoints
 * Get endpoints for the current user's legal entity
 */
export async function getMemberEndpoints(
	req: Request,
	res: Response,
): Promise<void> {
	try {
		const pool = getPool();
		const userEmail = (req as any).userEmail;

		if (!userEmail) {
			res.status(401).json({ error: "Unauthorized" });
			return;
		}

		// Get member's legal_entity_id using email
		let memberResult = await pool.query(
			`
      SELECT DISTINCT le.legal_entity_id
      FROM legal_entity le
      INNER JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
      WHERE c.email = $1 AND c.is_active = true
      LIMIT 1
    `,
			[userEmail],
		);

		// If not found, try by domain (members table dropped Dec 12, 2025)
		if (memberResult.rows.length === 0) {
			const emailDomain = userEmail.split("@")[1];
			memberResult = await pool.query(
				`
        SELECT legal_entity_id
        FROM vw_legal_entities
        WHERE domain = $1
        LIMIT 1
      `,
				[emailDomain],
			);
		}

		if (memberResult.rows.length === 0) {
			res.status(404).json({ error: "Member not found" });
			return;
		}

		const { legal_entity_id } = memberResult.rows[0];

		// Get all endpoints for this member's legal entity
		const result = await pool.query(
			`
      SELECT
        legal_entity_endpoint_id,
        legal_entity_id,
        endpoint_name,
        endpoint_url,
        endpoint_description,
        data_category,
        endpoint_type,
        authentication_method,
        last_connection_test,
        last_connection_status,
        is_active,
        activation_date,
        deactivation_date,
        verification_status,
        verification_sent_at,
        verification_expires_at,
        access_model,
        publication_status,
        published_at,
        dt_created,
        dt_modified
      FROM legal_entity_endpoint
      WHERE legal_entity_id = $1
        AND is_deleted = false
      ORDER BY dt_created DESC
    `,
			[legal_entity_id],
		);

		res.json({ endpoints: result.rows });
	} catch (error: any) {
		console.error("Error fetching member endpoints:", error);
		res.status(500).json({ error: "Failed to fetch member endpoints" });
	}
}

// ============================================================================
// ENDPOINT REGISTRATION WORKFLOW
// ============================================================================

/**
 * Generate a secure random verification token
 */
function generateVerificationToken(): string {
	return randomBytes(32).toString("hex");
}

/**
 * POST /v1/entities/:legalEntityId/endpoints/register
 * Step 1: Initiate endpoint registration - creates endpoint with PENDING status
 */
export async function initiateRegistration(
	req: Request,
	res: Response,
): Promise<void> {
	try {
		const pool = getPool();
		const { legalEntityId } = req.params;
		const endpointId = randomUUID();

		const {
			endpoint_name,
			endpoint_url,
			endpoint_description,
			data_category,
			endpoint_type,
			access_model,
		} = req.body;

		// Validate required fields
		if (!endpoint_name) {
			res.status(400).json({ error: "endpoint_name is required" });
			return;
		}

		if (!endpoint_url) {
			res.status(400).json({ error: "endpoint_url is required" });
			return;
		}

		// Validate URL format
		if (!endpoint_url.startsWith("https://")) {
			res.status(400).json({ error: "endpoint_url must start with https://" });
			return;
		}

		// SSRF protection: Validate URL
		const urlValidation = isUrlSafeForFetch(endpoint_url);
		if (!urlValidation.safe) {
			res.status(400).json({ error: `Invalid URL: ${urlValidation.reason}` });
			return;
		}

		// Verify legal entity exists
		const { rows: entityRows } = await pool.query(
			`SELECT legal_entity_id FROM legal_entity WHERE legal_entity_id = $1 AND is_deleted = false`,
			[legalEntityId],
		);

		if (entityRows.length === 0) {
			res.status(404).json({ error: "Legal entity not found" });
			return;
		}

		// Validate access_model if provided
		const validAccessModels = ["open", "restricted", "private"];
		const accessModelValue = access_model || "private";
		if (!validAccessModels.includes(accessModelValue)) {
			res.status(400).json({
				error: `Invalid access_model. Must be one of: ${validAccessModels.join(", ")}`,
			});
			return;
		}

		// Create endpoint with PENDING verification status
		const { rows } = await pool.query(
			`
      INSERT INTO legal_entity_endpoint (
        legal_entity_endpoint_id,
        legal_entity_id,
        endpoint_name,
        endpoint_url,
        endpoint_description,
        data_category,
        endpoint_type,
        access_model,
        publication_status,
        verification_status,
        is_active,
        dt_created,
        dt_modified
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', 'PENDING', false, NOW(), NOW())
      RETURNING *
    `,
			[
				endpointId,
				legalEntityId,
				endpoint_name,
				endpoint_url,
				endpoint_description || null,
				data_category || "DATA_EXCHANGE",
				endpoint_type || "REST_API",
				accessModelValue,
			],
		);

		// Invalidate cache
		invalidateCacheForUser(
			req,
			`/v1/legal-entities/${legalEntityId}/endpoints`,
		);
		invalidateCacheForUser(req, `/v1/member-endpoints`);

		console.log(
			`Endpoint registration initiated: ${endpointId} for entity ${legalEntityId}`,
		);

		res.status(201).json(rows[0]);
	} catch (error: any) {
		console.error("Error initiating endpoint registration:", error);
		res
			.status(500)
			.json({
				error: "Failed to initiate endpoint registration",
				detail: error.message,
			});
	}
}

/**
 * POST /v1/endpoints/:endpointId/send-verification
 * Step 2: Callback Challenge-Response Verification
 *
 * Sends a challenge to the endpoint URL and verifies the response.
 * This proves the registrant actually controls the endpoint.
 *
 * Flow:
 * 1. Generate a unique challenge token
 * 2. POST to their endpoint: { "type": "ctn_verification", "challenge": "abc123" }
 * 3. Expect response: { "challenge": "abc123" }
 * 4. If challenge matches → endpoint verified
 */
export async function sendVerificationEmail(
	req: Request,
	res: Response,
): Promise<void> {
	try {
		const pool = getPool();
		const { endpointId } = req.params;

		// Get the endpoint
		const { rows, rowCount } = await pool.query(
			`
      SELECT legal_entity_endpoint_id, endpoint_name, endpoint_url, verification_status, legal_entity_id
      FROM legal_entity_endpoint
      WHERE legal_entity_endpoint_id = $1 AND is_deleted = false
    `,
			[endpointId],
		);

		if (rowCount === 0) {
			res.status(404).json({ error: "Endpoint not found" });
			return;
		}

		const endpoint = rows[0];

		// Check if already verified
		if (endpoint.verification_status === "VERIFIED") {
			res.status(400).json({ error: "Endpoint is already verified" });
			return;
		}

		if (!endpoint.endpoint_url) {
			res.status(400).json({ error: "Endpoint URL is required for verification" });
			return;
		}

		// SSRF protection
		const urlValidation = isUrlSafeForFetch(endpoint.endpoint_url);
		if (!urlValidation.safe) {
			res.status(400).json({ error: `Invalid URL: ${urlValidation.reason}` });
			return;
		}

		// Generate challenge token
		const challenge = generateVerificationToken();
		const timestamp = new Date().toISOString();

		// Update status to indicate verification in progress
		await pool.query(
			`
      UPDATE legal_entity_endpoint
      SET verification_token = $2,
          verification_status = 'SENT',
          verification_sent_at = NOW(),
          dt_modified = NOW()
      WHERE legal_entity_endpoint_id = $1
    `,
			[endpointId, challenge],
		);

		// Prepare the challenge payload
		const challengePayload = {
			type: "ctn_endpoint_verification",
			challenge: challenge,
			endpoint_id: endpointId,
			timestamp: timestamp,
			// Include info so their endpoint knows what this is
			message: "Please respond with the challenge value to verify endpoint ownership",
		};

		console.log(`Sending verification challenge to ${endpoint.endpoint_url}`);

		let verificationSuccess = false;
		let errorMessage: string | undefined;
		let responseData: any;

		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

			const response = await fetch(endpoint.endpoint_url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-CTN-Verification": "true",
					"X-CTN-Challenge": challenge,
				},
				body: JSON.stringify(challengePayload),
				signal: controller.signal,
				redirect: "manual",
			});
			clearTimeout(timeout);

			if (response.ok) {
				try {
					responseData = await response.json();

					// Check if the challenge was echoed back correctly
					if (responseData.challenge === challenge) {
						verificationSuccess = true;
					} else {
						errorMessage = "Challenge response mismatch. Endpoint must echo back the challenge value.";
					}
				} catch {
					errorMessage = "Endpoint did not return valid JSON response";
				}
			} else {
				errorMessage = `Endpoint returned HTTP ${response.status}`;
			}
		} catch (fetchError: any) {
			if (fetchError.name === "AbortError") {
				errorMessage = "Connection timeout (15s) - endpoint did not respond";
			} else {
				errorMessage = fetchError.message || "Failed to connect to endpoint";
			}
		}

		if (verificationSuccess) {
			// Update to VERIFIED status
			const { rows: updatedRows } = await pool.query(
				`
        UPDATE legal_entity_endpoint
        SET verification_status = 'VERIFIED',
            verification_token = NULL,
            dt_modified = NOW()
        WHERE legal_entity_endpoint_id = $1
        RETURNING *
      `,
				[endpointId],
			);

			console.log(`Endpoint ${endpointId} verified successfully via callback`);

			// Invalidate cache
			invalidateCacheForUser(req, `/v1/legal-entities/${endpoint.legal_entity_id}/endpoints`);
			invalidateCacheForUser(req, "/v1/member-endpoints");

			res.json({
				message: "Endpoint verified successfully",
				verified: true,
				endpoint: updatedRows[0],
			});
		} else {
			// Update to FAILED status
			await pool.query(
				`
        UPDATE legal_entity_endpoint
        SET verification_status = 'FAILED',
            verification_token = NULL,
            connection_test_details = $2,
            dt_modified = NOW()
        WHERE legal_entity_endpoint_id = $1
      `,
				[endpointId, JSON.stringify({ error: errorMessage, attempted_at: timestamp })],
			);

			res.status(400).json({
				message: "Endpoint verification failed",
				verified: false,
				error: errorMessage,
				hint: "Your endpoint must respond to POST requests with JSON containing the challenge value: { \"challenge\": \"<received_challenge>\" }",
			});
		}
	} catch (error: any) {
		console.error("Error during endpoint verification:", error);
		res.status(500).json({
			error: "Failed to verify endpoint",
			detail: error.message,
		});
	}
}

/**
 * POST /v1/endpoints/:endpointId/verify-token
 * Step 3: Check verification status (callback verification is automatic)
 *
 * With callback verification, this endpoint now serves as a status check.
 * The actual verification happens in send-verification via callback.
 *
 * For backward compatibility, if a token is provided, it will be validated
 * against the stored token (manual verification fallback).
 */
export async function verifyToken(req: Request, res: Response): Promise<void> {
	try {
		const pool = getPool();
		const { endpointId } = req.params;
		const { token } = req.body;

		if (!token) {
			res.status(400).json({ error: "Token is required" });
			return;
		}

		// Get the endpoint with verification details
		const { rows, rowCount } = await pool.query(
			`
      SELECT
        legal_entity_endpoint_id,
        endpoint_name,
        verification_token,
        verification_status,
        verification_expires_at,
        legal_entity_id
      FROM legal_entity_endpoint
      WHERE legal_entity_endpoint_id = $1 AND is_deleted = false
    `,
			[endpointId],
		);

		if (rowCount === 0) {
			res.status(404).json({ error: "Endpoint not found" });
			return;
		}

		const endpoint = rows[0];

		// Check if already verified
		if (endpoint.verification_status === "VERIFIED") {
			res.status(400).json({ error: "Endpoint is already verified" });
			return;
		}

		// Check if token was sent
		if (endpoint.verification_status === "PENDING") {
			res
				.status(400)
				.json({ error: "Verification email has not been sent yet" });
			return;
		}

		// Check if token has expired
		if (
			endpoint.verification_expires_at &&
			new Date(endpoint.verification_expires_at) < new Date()
		) {
			// Update status to EXPIRED
			await pool.query(
				`
        UPDATE legal_entity_endpoint
        SET verification_status = 'EXPIRED', dt_modified = NOW()
        WHERE legal_entity_endpoint_id = $1
      `,
				[endpointId],
			);

			res
				.status(400)
				.json({
					error: "Verification token has expired. Please request a new one.",
				});
			return;
		}

		// Validate the token (constant-time comparison to prevent timing attacks)
		const storedToken = endpoint.verification_token || "";
		const providedToken = token || "";

		// Simple string comparison (for hex tokens, timing attack risk is minimal)
		if (storedToken !== providedToken) {
			res.status(400).json({ error: "Invalid verification token" });
			return;
		}

		// Token is valid - update status to VERIFIED
		const { rows: updatedRows } = await pool.query(
			`
      UPDATE legal_entity_endpoint
      SET verification_status = 'VERIFIED',
          verification_token = NULL,
          dt_modified = NOW()
      WHERE legal_entity_endpoint_id = $1
      RETURNING *
    `,
			[endpointId],
		);

		console.log(`Endpoint ${endpointId} verified successfully`);

		// Invalidate cache
		invalidateCacheForUser(
			req,
			`/v1/legal-entities/${endpoint.legal_entity_id}/endpoints`,
		);
		invalidateCacheForUser(req, `/v1/member-endpoints`);

		res.json({
			message: "Email verified successfully",
			endpoint: updatedRows[0],
		});
	} catch (error: any) {
		console.error("Error verifying token:", error);
		res
			.status(500)
			.json({ error: "Failed to verify token", detail: error.message });
	}
}

/**
 * POST /v1/endpoints/:endpointId/activate
 * Step 5: Activate the endpoint after successful testing
 */
export async function activateEndpoint(
	req: Request,
	res: Response,
): Promise<void> {
	try {
		const pool = getPool();
		const { endpointId } = req.params;

		// Get the endpoint
		const { rows, rowCount } = await pool.query(
			`
      SELECT
        legal_entity_endpoint_id,
        endpoint_name,
        verification_status,
        last_connection_status,
        is_active,
        legal_entity_id
      FROM legal_entity_endpoint
      WHERE legal_entity_endpoint_id = $1 AND is_deleted = false
    `,
			[endpointId],
		);

		if (rowCount === 0) {
			res.status(404).json({ error: "Endpoint not found" });
			return;
		}

		const endpoint = rows[0];

		// Check if already active
		if (endpoint.is_active) {
			res.status(400).json({ error: "Endpoint is already active" });
			return;
		}

		// Check if email is verified
		if (endpoint.verification_status !== "VERIFIED") {
			res.status(400).json({
				error: "Email must be verified before activating endpoint",
				verification_status: endpoint.verification_status,
			});
			return;
		}

		// Check if test passed (optional but recommended)
		if (endpoint.last_connection_status !== "SUCCESS") {
			console.warn(`Activating endpoint ${endpointId} without successful test`);
		}

		// Activate the endpoint
		const { rows: updatedRows } = await pool.query(
			`
      UPDATE legal_entity_endpoint
      SET is_active = true,
          activation_date = NOW(),
          deactivation_date = NULL,
          deactivation_reason = NULL,
          dt_modified = NOW()
      WHERE legal_entity_endpoint_id = $1
      RETURNING *
    `,
			[endpointId],
		);

		console.log(`Endpoint ${endpointId} activated successfully`);

		// Invalidate cache
		invalidateCacheForUser(
			req,
			`/v1/legal-entities/${endpoint.legal_entity_id}/endpoints`,
		);
		invalidateCacheForUser(req, `/v1/member-endpoints`);

		res.json({
			message: "Endpoint activated successfully",
			endpoint: updatedRows[0],
		});
	} catch (error: any) {
		console.error("Error activating endpoint:", error);
		res
			.status(500)
			.json({ error: "Failed to activate endpoint", detail: error.message });
	}
}

// ============================================================================
// ENDPOINT LIFECYCLE - PUBLICATION (Phase 3)
// ============================================================================

/**
 * POST /v1/endpoints/:endpointId/publish
 * Publish endpoint to the CTN directory (makes it discoverable)
 * Requires endpoint to be VERIFIED
 */
export async function publishEndpoint(
	req: Request,
	res: Response,
): Promise<void> {
	try {
		const pool = getPool();
		const { endpointId } = req.params;

		// Get the endpoint
		const { rows, rowCount } = await pool.query(
			`
      SELECT
        legal_entity_endpoint_id,
        endpoint_name,
        verification_status,
        publication_status,
        is_active,
        legal_entity_id
      FROM legal_entity_endpoint
      WHERE legal_entity_endpoint_id = $1 AND is_deleted = false
    `,
			[endpointId],
		);

		if (rowCount === 0) {
			res.status(404).json({ error: "Endpoint not found" });
			return;
		}

		const endpoint = rows[0];

		// IDOR protection: Verify user has access to this endpoint
		const userEmail = (req as any).userEmail;
		const userRoles = (req as any).userRoles || [];
		const isAdmin =
			userRoles.includes("SystemAdmin") ||
			userRoles.includes("AssociationAdmin");

		if (!isAdmin) {
			const { rows: partyRows } = await pool.query(
				`
        SELECT 1 FROM legal_entity le
        JOIN legal_entity_contact lec ON lec.legal_entity_id = le.legal_entity_id
        WHERE le.legal_entity_id = $1
          AND lec.email = $2
          AND lec.is_active = true
          AND le.is_deleted = false
      `,
				[endpoint.legal_entity_id, userEmail],
			);

			if (partyRows.length === 0) {
				res.status(404).json({ error: "Endpoint not found" });
				return;
			}
		}

		// Check if endpoint is verified
		if (endpoint.verification_status !== "VERIFIED") {
			res.status(400).json({
				error: "Endpoint must be verified before publishing",
				verification_status: endpoint.verification_status,
			});
			return;
		}

		// Check if already published
		if (endpoint.publication_status === "published") {
			res.status(400).json({ error: "Endpoint is already published" });
			return;
		}

		// Publish the endpoint (also activate if not active)
		const { rows: updatedRows } = await pool.query(
			`
      UPDATE legal_entity_endpoint
      SET publication_status = 'published',
          published_at = COALESCE(published_at, NOW()),
          is_active = true,
          activation_date = COALESCE(activation_date, NOW()),
          dt_modified = NOW()
      WHERE legal_entity_endpoint_id = $1
      RETURNING *
    `,
			[endpointId],
		);

		console.log(`Endpoint ${endpointId} published to directory`);

		// Invalidate cache
		invalidateCacheForUser(
			req,
			`/v1/legal-entities/${endpoint.legal_entity_id}/endpoints`,
		);
		invalidateCacheForUser(req, "/v1/member-endpoints");
		invalidateCacheForUser(req, "/v1/endpoint-directory");

		res.json({
			message: "Endpoint published successfully",
			endpoint: updatedRows[0],
		});
	} catch (error: any) {
		console.error("Error publishing endpoint:", error);
		res
			.status(500)
			.json({ error: "Failed to publish endpoint", detail: error.message });
	}
}

/**
 * POST /v1/endpoints/:endpointId/unpublish
 * Remove endpoint from the CTN directory (makes it undiscoverable)
 */
export async function unpublishEndpoint(
	req: Request,
	res: Response,
): Promise<void> {
	try {
		const pool = getPool();
		const { endpointId } = req.params;

		// Get the endpoint
		const { rows, rowCount } = await pool.query(
			`
      SELECT
        legal_entity_endpoint_id,
        endpoint_name,
        publication_status,
        legal_entity_id
      FROM legal_entity_endpoint
      WHERE legal_entity_endpoint_id = $1 AND is_deleted = false
    `,
			[endpointId],
		);

		if (rowCount === 0) {
			res.status(404).json({ error: "Endpoint not found" });
			return;
		}

		const endpoint = rows[0];

		// IDOR protection
		const userEmail = (req as any).userEmail;
		const userRoles = (req as any).userRoles || [];
		const isAdmin =
			userRoles.includes("SystemAdmin") ||
			userRoles.includes("AssociationAdmin");

		if (!isAdmin) {
			const { rows: partyRows } = await pool.query(
				`
        SELECT 1 FROM legal_entity le
        JOIN legal_entity_contact lec ON lec.legal_entity_id = le.legal_entity_id
        WHERE le.legal_entity_id = $1
          AND lec.email = $2
          AND lec.is_active = true
          AND le.is_deleted = false
      `,
				[endpoint.legal_entity_id, userEmail],
			);

			if (partyRows.length === 0) {
				res.status(404).json({ error: "Endpoint not found" });
				return;
			}
		}

		// Check if not published
		if (endpoint.publication_status !== "published") {
			res.status(400).json({ error: "Endpoint is not currently published" });
			return;
		}

		// Unpublish the endpoint
		const { rows: updatedRows } = await pool.query(
			`
      UPDATE legal_entity_endpoint
      SET publication_status = 'unpublished',
          dt_modified = NOW()
      WHERE legal_entity_endpoint_id = $1
      RETURNING *
    `,
			[endpointId],
		);

		console.log(`Endpoint ${endpointId} unpublished from directory`);

		// Invalidate cache
		invalidateCacheForUser(
			req,
			`/v1/legal-entities/${endpoint.legal_entity_id}/endpoints`,
		);
		invalidateCacheForUser(req, "/v1/member-endpoints");
		invalidateCacheForUser(req, "/v1/endpoint-directory");

		res.json({
			message: "Endpoint unpublished successfully",
			endpoint: updatedRows[0],
		});
	} catch (error: any) {
		console.error("Error unpublishing endpoint:", error);
		res
			.status(500)
			.json({ error: "Failed to unpublish endpoint", detail: error.message });
	}
}

// ============================================================================
// ENDPOINT DIRECTORY - CONSUMER DISCOVERY (Phase 4)
// ============================================================================

/**
 * GET /v1/endpoint-directory
 * Get published endpoints for consumer discovery
 * Excludes the consumer's own endpoints
 */
export async function getPublishedEndpoints(
	req: Request,
	res: Response,
): Promise<void> {
	try {
		const pool = getPool();
		const userEmail = (req as any).userEmail;

		// Get the consumer's legal entity ID to exclude their own endpoints
		let consumerEntityId: string | null = null;

		const { rows: contactRows } = await pool.query(
			`
      SELECT DISTINCT le.legal_entity_id
      FROM legal_entity le
      INNER JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
      WHERE c.email = $1 AND c.is_active = true AND le.is_deleted = false
      LIMIT 1
    `,
			[userEmail],
		);

		if (contactRows.length > 0) {
			consumerEntityId = contactRows[0].legal_entity_id;
		}

		// Get all published endpoints (excluding consumer's own)
		const { rows } = await pool.query(
			`
      SELECT
        e.legal_entity_endpoint_id,
        e.endpoint_name,
        e.endpoint_description,
        e.data_category,
        e.endpoint_type,
        e.access_model,
        e.published_at,
        e.legal_entity_id as provider_entity_id,
        le.primary_legal_name as provider_name,
        le.domain as provider_domain
      FROM legal_entity_endpoint e
      JOIN legal_entity le ON e.legal_entity_id = le.legal_entity_id
      WHERE e.publication_status = 'published'
        AND e.is_active = true
        AND e.is_deleted = false
        AND le.is_deleted = false
        AND ($1::uuid IS NULL OR e.legal_entity_id != $1)
      ORDER BY e.published_at DESC
    `,
			[consumerEntityId],
		);

		// For each endpoint, check if consumer has an existing access request or grant
		const endpointsWithAccess = await Promise.all(
			rows.map(async (endpoint) => {
				if (!consumerEntityId) {
					return { ...endpoint, access_status: null };
				}

				// Check for existing access request
				const { rows: requestRows } = await pool.query(
					`
          SELECT status FROM endpoint_access_request
          WHERE endpoint_id = $1 AND consumer_entity_id = $2 AND is_deleted = false
          ORDER BY requested_at DESC LIMIT 1
        `,
					[endpoint.legal_entity_endpoint_id, consumerEntityId],
				);

				// Check for active grant
				const { rows: grantRows } = await pool.query(
					`
          SELECT grant_id FROM endpoint_consumer_grant
          WHERE endpoint_id = $1 AND consumer_entity_id = $2 AND is_active = true
          LIMIT 1
        `,
					[endpoint.legal_entity_endpoint_id, consumerEntityId],
				);

				let accessStatus = null;
				if (grantRows.length > 0) {
					accessStatus = "granted";
				} else if (requestRows.length > 0) {
					accessStatus = requestRows[0].status;
				}

				return { ...endpoint, access_status: accessStatus };
			}),
		);

		res.json({ endpoints: endpointsWithAccess });
	} catch (error: any) {
		console.error("Error fetching published endpoints:", error);
		res
			.status(500)
			.json({ error: "Failed to fetch endpoint directory", detail: error.message });
	}
}

// ============================================================================
// ACCESS REQUEST WORKFLOW (Phase 4-5)
// ============================================================================

/**
 * POST /v1/endpoints/:endpointId/request-access
 * Consumer requests access to an endpoint
 * For 'open' endpoints: auto-approve immediately
 * For 'restricted'/'private': create pending request
 */
export async function requestAccess(
	req: Request,
	res: Response,
): Promise<void> {
	try {
		const pool = getPool();
		const { endpointId } = req.params;
		const { requested_scopes } = req.body;
		const userEmail = (req as any).userEmail;

		// Get consumer's legal entity
		const { rows: contactRows } = await pool.query(
			`
      SELECT DISTINCT le.legal_entity_id
      FROM legal_entity le
      INNER JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
      WHERE c.email = $1 AND c.is_active = true AND le.is_deleted = false
      LIMIT 1
    `,
			[userEmail],
		);

		if (contactRows.length === 0) {
			res.status(403).json({ error: "No legal entity associated with your account" });
			return;
		}

		const consumerEntityId = contactRows[0].legal_entity_id;

		// Get the endpoint
		const { rows: endpointRows, rowCount } = await pool.query(
			`
      SELECT
        legal_entity_endpoint_id,
        endpoint_name,
        access_model,
        publication_status,
        legal_entity_id as provider_entity_id
      FROM legal_entity_endpoint
      WHERE legal_entity_endpoint_id = $1
        AND is_deleted = false
        AND publication_status = 'published'
        AND is_active = true
    `,
			[endpointId],
		);

		if (rowCount === 0) {
			res.status(404).json({ error: "Endpoint not found or not published" });
			return;
		}

		const endpoint = endpointRows[0];

		// Check if consumer is trying to request their own endpoint
		if (endpoint.provider_entity_id === consumerEntityId) {
			res.status(400).json({ error: "Cannot request access to your own endpoint" });
			return;
		}

		// Check for existing pending request
		const { rows: existingRequest } = await pool.query(
			`
      SELECT access_request_id, status
      FROM endpoint_access_request
      WHERE endpoint_id = $1 AND consumer_entity_id = $2 AND is_deleted = false
      ORDER BY requested_at DESC LIMIT 1
    `,
			[endpointId, consumerEntityId],
		);

		if (existingRequest.length > 0) {
			const status = existingRequest[0].status;
			if (status === "pending") {
				res.status(400).json({ error: "You already have a pending request for this endpoint" });
				return;
			}
			if (status === "approved") {
				res.status(400).json({ error: "You already have access to this endpoint" });
				return;
			}
		}

		// Check for existing active grant
		const { rows: existingGrant } = await pool.query(
			`
      SELECT grant_id FROM endpoint_consumer_grant
      WHERE endpoint_id = $1 AND consumer_entity_id = $2 AND is_active = true
      LIMIT 1
    `,
			[endpointId, consumerEntityId],
		);

		if (existingGrant.length > 0) {
			res.status(400).json({ error: "You already have an active grant for this endpoint" });
			return;
		}

		const requestId = randomUUID();
		const scopes = requested_scopes || ["read"];

		// Handle based on access model
		if (endpoint.access_model === "open") {
			// Auto-approve for open endpoints
			// Create request with approved status
			await pool.query(
				`
        INSERT INTO endpoint_access_request (
          access_request_id, endpoint_id, consumer_entity_id, provider_entity_id,
          status, requested_scopes, approved_scopes, requested_at, decided_at, decided_by
        )
        VALUES ($1, $2, $3, $4, 'approved', $5, $5, NOW(), NOW(), 'AUTO_APPROVED')
      `,
				[requestId, endpointId, consumerEntityId, endpoint.provider_entity_id, scopes],
			);

			// Create grant immediately
			const grantId = randomUUID();
			const { rows: grantRows } = await pool.query(
				`
        INSERT INTO endpoint_consumer_grant (
          grant_id, access_request_id, endpoint_id, consumer_entity_id,
          granted_scopes, is_active, granted_at
        )
        VALUES ($1, $2, $3, $4, $5, true, NOW())
        RETURNING *
      `,
				[grantId, requestId, endpointId, consumerEntityId, scopes],
			);

			console.log(`Auto-approved access request ${requestId} for open endpoint ${endpointId}`);

			res.status(201).json({
				message: "Access granted automatically (open endpoint)",
				access_request_id: requestId,
				grant: grantRows[0],
				status: "approved",
			});
		} else {
			// For restricted/private: create pending request
			const { rows: requestRows } = await pool.query(
				`
        INSERT INTO endpoint_access_request (
          access_request_id, endpoint_id, consumer_entity_id, provider_entity_id,
          status, requested_scopes, requested_at
        )
        VALUES ($1, $2, $3, $4, 'pending', $5, NOW())
        RETURNING *
      `,
				[requestId, endpointId, consumerEntityId, endpoint.provider_entity_id, scopes],
			);

			console.log(`Access request ${requestId} created for ${endpoint.access_model} endpoint ${endpointId}`);

			res.status(201).json({
				message: `Access request submitted. Provider will review your request.`,
				access_request: requestRows[0],
				status: "pending",
			});
		}
	} catch (error: any) {
		console.error("Error requesting access:", error);
		res
			.status(500)
			.json({ error: "Failed to request access", detail: error.message });
	}
}

/**
 * GET /v1/endpoints/:endpointId/access-requests
 * Provider views access requests for their endpoint
 */
export async function getAccessRequests(
	req: Request,
	res: Response,
): Promise<void> {
	try {
		const pool = getPool();
		const { endpointId } = req.params;
		const { status } = req.query;
		const userEmail = (req as any).userEmail;
		const userRoles = (req as any).userRoles || [];

		// Get the endpoint and verify ownership
		const { rows: endpointRows, rowCount } = await pool.query(
			`
      SELECT legal_entity_endpoint_id, legal_entity_id
      FROM legal_entity_endpoint
      WHERE legal_entity_endpoint_id = $1 AND is_deleted = false
    `,
			[endpointId],
		);

		if (rowCount === 0) {
			res.status(404).json({ error: "Endpoint not found" });
			return;
		}

		const endpoint = endpointRows[0];

		// IDOR protection
		const isAdmin =
			userRoles.includes("SystemAdmin") ||
			userRoles.includes("AssociationAdmin");

		if (!isAdmin) {
			const { rows: partyRows } = await pool.query(
				`
        SELECT 1 FROM legal_entity le
        JOIN legal_entity_contact lec ON lec.legal_entity_id = le.legal_entity_id
        WHERE le.legal_entity_id = $1
          AND lec.email = $2
          AND lec.is_active = true
          AND le.is_deleted = false
      `,
				[endpoint.legal_entity_id, userEmail],
			);

			if (partyRows.length === 0) {
				res.status(404).json({ error: "Endpoint not found" });
				return;
			}
		}

		// Build query with optional status filter
		let query = `
      SELECT
        ar.access_request_id,
        ar.endpoint_id,
        ar.consumer_entity_id,
        ar.status,
        ar.requested_scopes,
        ar.approved_scopes,
        ar.requested_at,
        ar.decided_at,
        ar.decided_by,
        ar.denial_reason,
        le.primary_legal_name as consumer_name,
        le.domain as consumer_domain
      FROM endpoint_access_request ar
      JOIN legal_entity le ON ar.consumer_entity_id = le.legal_entity_id
      WHERE ar.endpoint_id = $1 AND ar.is_deleted = false
    `;
		const params: any[] = [endpointId];

		if (status) {
			query += ` AND ar.status = $2`;
			params.push(status);
		}

		query += ` ORDER BY ar.requested_at DESC`;

		const { rows } = await pool.query(query, params);

		res.json({ access_requests: rows });
	} catch (error: any) {
		console.error("Error fetching access requests:", error);
		res
			.status(500)
			.json({ error: "Failed to fetch access requests", detail: error.message });
	}
}

/**
 * POST /v1/access-requests/:requestId/approve
 * Provider approves an access request
 */
export async function approveAccessRequest(
	req: Request,
	res: Response,
): Promise<void> {
	try {
		const pool = getPool();
		const { requestId } = req.params;
		const { approved_scopes } = req.body;
		const userEmail = (req as any).userEmail;
		const userRoles = (req as any).userRoles || [];

		// Get the access request
		const { rows: requestRows, rowCount } = await pool.query(
			`
      SELECT
        ar.access_request_id,
        ar.endpoint_id,
        ar.consumer_entity_id,
        ar.provider_entity_id,
        ar.status,
        ar.requested_scopes,
        e.endpoint_name
      FROM endpoint_access_request ar
      JOIN legal_entity_endpoint e ON ar.endpoint_id = e.legal_entity_endpoint_id
      WHERE ar.access_request_id = $1 AND ar.is_deleted = false
    `,
			[requestId],
		);

		if (rowCount === 0) {
			res.status(404).json({ error: "Access request not found" });
			return;
		}

		const request = requestRows[0];

		// IDOR protection: verify user owns the endpoint
		const isAdmin =
			userRoles.includes("SystemAdmin") ||
			userRoles.includes("AssociationAdmin");

		if (!isAdmin) {
			const { rows: partyRows } = await pool.query(
				`
        SELECT 1 FROM legal_entity le
        JOIN legal_entity_contact lec ON lec.legal_entity_id = le.legal_entity_id
        WHERE le.legal_entity_id = $1
          AND lec.email = $2
          AND lec.is_active = true
          AND le.is_deleted = false
      `,
				[request.provider_entity_id, userEmail],
			);

			if (partyRows.length === 0) {
				res.status(404).json({ error: "Access request not found" });
				return;
			}
		}

		// Check if request is pending
		if (request.status !== "pending") {
			res.status(400).json({
				error: `Request is not pending (current status: ${request.status})`,
			});
			return;
		}

		// Use approved_scopes from body or default to requested_scopes
		const scopes = approved_scopes || request.requested_scopes;

		// Update request to approved
		await pool.query(
			`
      UPDATE endpoint_access_request
      SET status = 'approved',
          approved_scopes = $2,
          decided_at = NOW(),
          decided_by = $3,
          dt_modified = NOW()
      WHERE access_request_id = $1
    `,
			[requestId, scopes, userEmail],
		);

		// Create grant
		const grantId = randomUUID();
		const { rows: grantRows } = await pool.query(
			`
      INSERT INTO endpoint_consumer_grant (
        grant_id, access_request_id, endpoint_id, consumer_entity_id,
        granted_scopes, is_active, granted_at
      )
      VALUES ($1, $2, $3, $4, $5, true, NOW())
      RETURNING *
    `,
			[grantId, requestId, request.endpoint_id, request.consumer_entity_id, scopes],
		);

		console.log(`Access request ${requestId} approved by ${userEmail}`);

		res.json({
			message: "Access request approved",
			grant: grantRows[0],
		});
	} catch (error: any) {
		console.error("Error approving access request:", error);
		res
			.status(500)
			.json({ error: "Failed to approve access request", detail: error.message });
	}
}

/**
 * POST /v1/access-requests/:requestId/deny
 * Provider denies an access request
 */
export async function denyAccessRequest(
	req: Request,
	res: Response,
): Promise<void> {
	try {
		const pool = getPool();
		const { requestId } = req.params;
		const { denial_reason } = req.body;
		const userEmail = (req as any).userEmail;
		const userRoles = (req as any).userRoles || [];

		// Get the access request
		const { rows: requestRows, rowCount } = await pool.query(
			`
      SELECT
        ar.access_request_id,
        ar.provider_entity_id,
        ar.status
      FROM endpoint_access_request ar
      WHERE ar.access_request_id = $1 AND ar.is_deleted = false
    `,
			[requestId],
		);

		if (rowCount === 0) {
			res.status(404).json({ error: "Access request not found" });
			return;
		}

		const request = requestRows[0];

		// IDOR protection
		const isAdmin =
			userRoles.includes("SystemAdmin") ||
			userRoles.includes("AssociationAdmin");

		if (!isAdmin) {
			const { rows: partyRows } = await pool.query(
				`
        SELECT 1 FROM legal_entity le
        JOIN legal_entity_contact lec ON lec.legal_entity_id = le.legal_entity_id
        WHERE le.legal_entity_id = $1
          AND lec.email = $2
          AND lec.is_active = true
          AND le.is_deleted = false
      `,
				[request.provider_entity_id, userEmail],
			);

			if (partyRows.length === 0) {
				res.status(404).json({ error: "Access request not found" });
				return;
			}
		}

		// Check if request is pending
		if (request.status !== "pending") {
			res.status(400).json({
				error: `Request is not pending (current status: ${request.status})`,
			});
			return;
		}

		// Update request to denied
		const { rows: updatedRows } = await pool.query(
			`
      UPDATE endpoint_access_request
      SET status = 'denied',
          decided_at = NOW(),
          decided_by = $2,
          denial_reason = $3,
          dt_modified = NOW()
      WHERE access_request_id = $1
      RETURNING *
    `,
			[requestId, userEmail, denial_reason || null],
		);

		console.log(`Access request ${requestId} denied by ${userEmail}`);

		res.json({
			message: "Access request denied",
			access_request: updatedRows[0],
		});
	} catch (error: any) {
		console.error("Error denying access request:", error);
		res
			.status(500)
			.json({ error: "Failed to deny access request", detail: error.message });
	}
}

/**
 * GET /v1/my-access-grants
 * Consumer views their granted accesses
 */
export async function getMyAccessGrants(
	req: Request,
	res: Response,
): Promise<void> {
	try {
		const pool = getPool();
		const userEmail = (req as any).userEmail;

		// Get consumer's legal entity
		const { rows: contactRows } = await pool.query(
			`
      SELECT DISTINCT le.legal_entity_id
      FROM legal_entity le
      INNER JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
      WHERE c.email = $1 AND c.is_active = true AND le.is_deleted = false
      LIMIT 1
    `,
			[userEmail],
		);

		if (contactRows.length === 0) {
			res.status(403).json({ error: "No legal entity associated with your account" });
			return;
		}

		const consumerEntityId = contactRows[0].legal_entity_id;

		// Get all grants for this consumer
		const { rows } = await pool.query(
			`
      SELECT
        g.grant_id,
        g.endpoint_id,
        g.granted_scopes,
        g.is_active,
        g.granted_at,
        g.revoked_at,
        e.endpoint_name,
        e.endpoint_url,
        e.endpoint_description,
        e.data_category,
        e.endpoint_type,
        le.primary_legal_name as provider_name,
        le.domain as provider_domain
      FROM endpoint_consumer_grant g
      JOIN legal_entity_endpoint e ON g.endpoint_id = e.legal_entity_endpoint_id
      JOIN legal_entity le ON e.legal_entity_id = le.legal_entity_id
      WHERE g.consumer_entity_id = $1
      ORDER BY g.granted_at DESC
    `,
			[consumerEntityId],
		);

		res.json({ grants: rows });
	} catch (error: any) {
		console.error("Error fetching access grants:", error);
		res
			.status(500)
			.json({ error: "Failed to fetch access grants", detail: error.message });
	}
}

/**
 * POST /v1/grants/:grantId/revoke
 * Revoke an access grant (can be done by provider or consumer)
 */
export async function revokeGrant(
	req: Request,
	res: Response,
): Promise<void> {
	try {
		const pool = getPool();
		const { grantId } = req.params;
		const { revocation_reason } = req.body;
		const userEmail = (req as any).userEmail;
		const userRoles = (req as any).userRoles || [];

		// Get the grant
		const { rows: grantRows, rowCount } = await pool.query(
			`
      SELECT
        g.grant_id,
        g.endpoint_id,
        g.consumer_entity_id,
        g.is_active,
        e.legal_entity_id as provider_entity_id
      FROM endpoint_consumer_grant g
      JOIN legal_entity_endpoint e ON g.endpoint_id = e.legal_entity_endpoint_id
      WHERE g.grant_id = $1
    `,
			[grantId],
		);

		if (rowCount === 0) {
			res.status(404).json({ error: "Grant not found" });
			return;
		}

		const grant = grantRows[0];

		if (!grant.is_active) {
			res.status(400).json({ error: "Grant is already revoked" });
			return;
		}

		// IDOR protection: user must be consumer, provider, or admin
		const isAdmin =
			userRoles.includes("SystemAdmin") ||
			userRoles.includes("AssociationAdmin");

		if (!isAdmin) {
			// Check if user is consumer or provider
			const { rows: partyRows } = await pool.query(
				`
        SELECT le.legal_entity_id,
          CASE
            WHEN le.legal_entity_id = $2 THEN 'consumer'
            WHEN le.legal_entity_id = $3 THEN 'provider'
          END as role
        FROM legal_entity le
        JOIN legal_entity_contact lec ON lec.legal_entity_id = le.legal_entity_id
        WHERE lec.email = $1
          AND lec.is_active = true
          AND le.is_deleted = false
          AND le.legal_entity_id IN ($2, $3)
      `,
				[userEmail, grant.consumer_entity_id, grant.provider_entity_id],
			);

			if (partyRows.length === 0) {
				res.status(404).json({ error: "Grant not found" });
				return;
			}
		}

		// Revoke the grant
		const { rows: updatedRows } = await pool.query(
			`
      UPDATE endpoint_consumer_grant
      SET is_active = false,
          revoked_at = NOW(),
          revoked_by = $2,
          revocation_reason = $3,
          dt_modified = NOW()
      WHERE grant_id = $1
      RETURNING *
    `,
			[grantId, userEmail, revocation_reason || null],
		);

		// Also update the corresponding access request to 'revoked'
		await pool.query(
			`
      UPDATE endpoint_access_request
      SET status = 'revoked', dt_modified = NOW()
      WHERE access_request_id = (
        SELECT access_request_id FROM endpoint_consumer_grant WHERE grant_id = $1
      )
    `,
			[grantId],
		);

		console.log(`Grant ${grantId} revoked by ${userEmail}`);

		res.json({
			message: "Grant revoked successfully",
			grant: updatedRows[0],
		});
	} catch (error: any) {
		console.error("Error revoking grant:", error);
		res
			.status(500)
			.json({ error: "Failed to revoke grant", detail: error.message });
	}
}
