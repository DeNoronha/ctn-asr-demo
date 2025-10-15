/**
 * Safely get header value to avoid "Cannot read private member" error in Azure Functions v4
 */
export function safeGetHeader(headers: any, name: string): string | null {
  try {
    return headers.get(name);
  } catch (error) {
    return null;
  }
}

/**
 * Get client IP address from request headers
 */
export function getClientIp(headers: any): string | undefined {
  const forwardedFor = safeGetHeader(headers, 'x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = safeGetHeader(headers, 'x-real-ip');
  if (realIp) {
    return realIp;
  }
  return undefined;
}

/**
 * Get user agent from request headers
 */
export function getUserAgent(headers: any): string | undefined {
  return safeGetHeader(headers, 'user-agent') || undefined;
}
