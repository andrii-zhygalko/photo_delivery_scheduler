'use client';

import { WifiOff } from 'lucide-react';

/**
 * Offline fallback page
 * Shown when the user is offline and tries to navigate to an uncached page
 */
export default function OfflinePage() {
  return (
    <div className='flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-4'>
      <div className='text-center'>
        <div className='mb-6 inline-flex rounded-full bg-slate-900/50 p-6'>
          <WifiOff className='h-16 w-16 text-purple-400' />
        </div>
        <h1 className='mb-2 text-3xl font-bold text-white'>
          You&apos;re Offline
        </h1>
        <p className='mb-8 text-slate-400'>
          Please check your internet connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className='rounded-lg bg-purple-600 px-6 py-3 font-medium text-white transition-colors hover:bg-purple-700'>
          Try Again
        </button>
      </div>
    </div>
  );
}
