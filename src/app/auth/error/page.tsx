'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages: Record<string, string> = {
    Configuration: 'There is a problem with the server configuration.',
    AccessDenied: 'You do not have permission to sign in.',
    Verification: 'The verification token has expired or has already been used.',
    Default: 'An error occurred during authentication.',
  };

  const errorMessage = error ? errorMessages[error] || errorMessages.Default : errorMessages.Default;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-destructive">Authentication Error</h1>
          <p className="mt-4 text-lg text-muted-foreground">{errorMessage}</p>
          {error && (
            <p className="mt-2 text-sm text-muted-foreground">
              Error code: <code className="rounded bg-muted px-1 py-0.5">{error}</code>
            </p>
          )}
        </div>

        <div className="space-y-3">
          <Button asChild className="w-full" size="lg">
            <Link href="/auth/signin">Try Again</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Go Home</Link>
          </Button>
        </div>

        {error === 'AccessDenied' && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm dark:border-yellow-900 dark:bg-yellow-950">
            <p className="font-semibold text-yellow-900 dark:text-yellow-200">
              Common causes:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-yellow-800 dark:text-yellow-300">
              <li>Google OAuth redirect URI not configured correctly</li>
              <li>Google OAuth credentials invalid or expired</li>
              <li>Database connection issues</li>
              <li>Server configuration error</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md space-y-6 p-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-destructive">Loading...</h1>
          </div>
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}
