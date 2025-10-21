"use strict";
/**
 * Authentication utilities for Azure AD JWT token validation
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserFromRequest = getUserFromRequest;
exports.hasRole = hasRole;
exports.hasAnyRole = hasAnyRole;
const jwt = __importStar(require("jsonwebtoken"));
const jwksClient = __importStar(require("jwks-rsa"));
const TENANT_ID = process.env.AZURE_TENANT_ID || '598664e7-725c-4daa-bd1f-89c4ada717ff';
const CLIENT_ID = process.env.AZURE_CLIENT_ID || 'd3037c11-a541-4f21-8862-8079137a0cde';
// JWKS client for getting public keys
const client = jwksClient.default({
    jwksUri: `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`
});
function getKey(header, callback) {
    client.getSigningKey(header.kid, (err, key) => {
        if (err) {
            callback(err);
            return;
        }
        const signingKey = key?.getPublicKey();
        callback(null, signingKey);
    });
}
/**
 * Extract and validate user from JWT token in Authorization header
 */
async function getUserFromRequest(context, req) {
    try {
        const authHeader = req.headers?.authorization || req.headers?.Authorization;
        if (!authHeader) {
            context.log.warn('No authorization header found');
            return null;
        }
        const token = authHeader.replace('Bearer ', '');
        // Verify and decode JWT token
        // Accept both formats: "api://{CLIENT_ID}" and "api://{CLIENT_ID}/access_as_user"
        const decoded = await new Promise((resolve, reject) => {
            jwt.verify(token, getKey, {
                audience: [
                    CLIENT_ID,
                    `api://${CLIENT_ID}`,
                    `api://${CLIENT_ID}/access_as_user`
                ],
                issuer: `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
                algorithms: ['RS256']
            }, (err, decoded) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(decoded);
                }
            });
        });
        context.log('JWT token verified successfully');
        context.log('Token claims:', JSON.stringify(decoded, null, 2));
        // Extract user information from token claims
        const user = {
            email: decoded.preferred_username || decoded.upn || decoded.email || 'unknown@example.com',
            name: decoded.name || 'Unknown User',
            userId: decoded.oid || decoded.sub,
            roles: decoded.roles || [],
            tenantId: decoded.extension_TenantId || undefined
        };
        context.log('Authenticated user:', user.email, 'Roles:', user.roles);
        return user;
    }
    catch (error) {
        context.log.error('JWT validation error:', error.message);
        return null;
    }
}
/**
 * Verify user has required role
 */
function hasRole(user, role) {
    return user.roles.includes(role);
}
/**
 * Verify user has at least one of the required roles
 */
function hasAnyRole(user, roles) {
    return roles.some(role => user.roles.includes(role));
}
//# sourceMappingURL=auth.js.map