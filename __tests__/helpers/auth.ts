import type { Session } from 'next-auth';

/**
 * Create a mock session for testing
 */
export function mockSession(userId: string, email: string): Session {
  return {
    user: {
      id: userId,
      email,
      name: 'Test User',
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}
