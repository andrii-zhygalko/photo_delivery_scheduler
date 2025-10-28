/**
 * Create a mock Request for testing API route handlers
 * Properly handles body parsing for json() method
 */
export function createMockRequest(
  url: string,
  options?: {
    method?: string;
    body?: unknown;
  }
): Request {
  const { method = 'GET', body } = options || {};

  // Handle body - if it's already a string (from JSON.stringify), use it as-is
  // Otherwise, stringify it
  let bodyString: string | undefined;
  if (body !== undefined && method !== 'GET') {
    bodyString = typeof body === 'string' ? body : JSON.stringify(body);
  }

  // Create a base Request object
  const request = new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    ...(bodyString ? { body: bodyString } : {}),
  });

  return request;
}
