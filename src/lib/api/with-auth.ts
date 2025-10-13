import { Session } from 'next-auth';
import { getServerSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

/**
 * Wrapper for API handlers that require authentication.
 * Automatically sets the app.user_id GUC for RLS.
 */
export async function withAuth<T>(
  handler: (
    session: Session,
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0]
  ) => Promise<T>
): Promise<T> {
  const session = await getServerSession();

  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  return db.transaction(async (tx) => {
    // Set GUC for RLS
    // TypeScript narrowing: we already checked session.user.id above
    const userId = session.user!.id;
    await tx.execute(`SET LOCAL app.user_id = '${userId}'`);

    // Call handler with session and transaction
    return handler(session, tx);
  });
}

/**
 * Error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Wrapper to handle API errors and return proper Response
 */
export async function handleApiRequest<T>(
  handler: () => Promise<T>
): Promise<Response> {
  try {
    const result = await handler();
    return Response.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      console.error('API Error:', error);
      return Response.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    return Response.json({ error: 'Unknown error' }, { status: 500 });
  }
}
