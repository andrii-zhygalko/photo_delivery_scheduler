import { NextRequest } from 'next/server';

/**
 * Create a mock NextRequest for testing API route handlers
 * Properly handles body parsing for json() method
 */
export function createMockRequest(
  url: string,
  options?: {
    method?: string;
    body?: unknown;
  }
): NextRequest {
  const { method = 'GET', body } = options || {};

  // Handle body - if it's already a string (from JSON.stringify), use it as-is
  // Otherwise, stringify it
  let bodyString: string | undefined;
  if (body !== undefined && method !== 'GET') {
    bodyString = typeof body === 'string' ? body : JSON.stringify(body);
  }

  // Create a NextRequest object
  const request = new NextRequest(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    ...(bodyString ? { body: bodyString } : {}),
  });

  return request;
}
