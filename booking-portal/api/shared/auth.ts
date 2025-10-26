/**
 * Authentication utilities for Azure AD JWT token validation
 */

import { Context, HttpRequest } from "@azure/functions";
import * as jwt from "jsonwebtoken";
import * as jwksClient from "jwks-rsa";

// CRITICAL: No fallback values - fail fast if environment variables missing
const TENANT_ID = process.env.AZURE_TENANT_ID;
const CLIENT_ID = process.env.AZURE_CLIENT_ID;

// Validate at module initialization
if (!TENANT_ID || !CLIENT_ID) {
    throw new Error('CRITICAL: AZURE_TENANT_ID and AZURE_CLIENT_ID must be configured in environment variables');
}

// JWKS client for getting public keys
const client = jwksClient.default({
    jwksUri: `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
    client.getSigningKey(header.kid!, (err, key) => {
        if (err) {
            callback(err);
            return;
        }
        const signingKey = key?.getPublicKey();
        callback(null, signingKey);
    });
}

export interface AuthenticatedUser {
    email: string;
    name: string;
    userId: string;
    roles: string[];
    tenantId?: string;
}

/**
 * Extract and validate user from JWT token in Authorization header
 */
export async function getUserFromRequest(context: Context, req: HttpRequest): Promise<AuthenticatedUser | null> {
    try {
        const authHeader = req.headers?.authorization || req.headers?.Authorization;

        if (!authHeader) {
            context.log.warn('No authorization header found');
            return null;
        }

        const token = authHeader.replace('Bearer ', '');

        // Verify and decode JWT token
        // Accept both formats: "api://{CLIENT_ID}" and "api://{CLIENT_ID}/access_as_user"
        const decoded = await new Promise<any>((resolve, reject) => {
            jwt.verify(
                token,
                getKey,
                {
                    audience: [
                        CLIENT_ID,
                        `api://${CLIENT_ID}`,
                        `api://${CLIENT_ID}/access_as_user`
                    ],
                    issuer: `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
                    algorithms: ['RS256']
                },
                (err, decoded) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(decoded);
                    }
                }
            );
        });

        context.log('JWT token verified successfully');
        context.log('Token claims:', JSON.stringify(decoded, null, 2));

        // Extract user information from token claims
        const user: AuthenticatedUser = {
            email: decoded.preferred_username || decoded.upn || decoded.email || 'unknown@example.com',
            name: decoded.name || 'Unknown User',
            userId: decoded.oid || decoded.sub,
            roles: decoded.roles || [],
            tenantId: decoded.extension_TenantId || undefined
        };

        context.log('Authenticated user:', user.email, 'Roles:', user.roles);

        return user;
    } catch (error: any) {
        context.log.error('JWT validation error:', error.message);
        return null;
    }
}

/**
 * Verify user has required role
 */
export function hasRole(user: AuthenticatedUser, role: string): boolean {
    return user.roles.includes(role);
}

/**
 * Verify user has at least one of the required roles
 */
export function hasAnyRole(user: AuthenticatedUser, roles: string[]): boolean {
    return roles.some(role => user.roles.includes(role));
}
