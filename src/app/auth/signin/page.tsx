'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-4 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Photo Delivery Scheduler</h1>
          <p className="mt-2 text-muted-foreground">
            Track your photography delivery deadlines
          </p>
        </div>

        <Button
          onClick={() => signIn('google', { callbackUrl: '/items' })}
          className="w-full"
          size="lg"
        >
          Sign in with Google
        </Button>
      </div>
    </div>
  );
}
