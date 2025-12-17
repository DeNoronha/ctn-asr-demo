/**
 * Authentication Middleware
 *
 * Express middleware for JWT token validation.
 * Validates Bearer tokens and attaches user info to the request.
 *
 * @module routes/middleware/requireAuth
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { validateJwtToken, JwtPayload } from '../../middleware/auth';

/**
 * Middleware to require authentication via JWT Bearer token
 *
 * Extracts and validates the JWT from the Authorization header,
 * then attaches user information to the request object.
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware function
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header'
    });
    return;
  }

  try {
    const token = authHeader.substring(7);

    // Create a minimal InvocationContext-like object for the validator
    const context = {
      invocationId: randomUUID(),
      log: console.log,
      warn: console.warn,
      error: console.error,
      trace: console.trace,
      debug: console.debug,
    } as any;

    // Validate JWT token with signature verification
    const payload: JwtPayload = await validateJwtToken(token, context);

    // Attach user info to request
    (req as any).user = payload;
    (req as any).userId = payload.oid || payload.sub;
    (req as any).userEmail = payload.email || payload.preferred_username || payload.upn;
    (req as any).userRoles = payload.roles || [];
    (req as any).isM2M = !payload.oid && (!!payload.azp || !!payload.appid);
    (req as any).clientId = payload.azp || payload.appid;

    next();
  } catch (error: any) {
    res.status(401).json({
      error: 'Unauthorized',
      message: error.message || 'Invalid token'
    });
  }
}

export default requireAuth;
