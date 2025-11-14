'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { AuroraText } from '@/components/aurora-text';

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn('google', { callbackUrl: '/items' });
    } catch (error) {
      setIsLoading(false);
      console.error('Sign in error:', error);
    }
  };

  return (
    <div className='relative min-h-screen overflow-hidden'>
      {/* Background Image Layer */}
      <div className='absolute inset-0 animate-fade-in'>
        <Image
          src='/login_background.webp'
          alt='Photographer taking photo'
          fill
          priority
          className='object-cover'
          quality={90}
        />
        {/* Dark gradient overlay for text contrast */}
        <div className='absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70' />
      </div>

      {/* Content Layer */}
      <div className='relative z-10 flex min-h-screen items-end justify-center p-4 pb-12 md:items-center md:pb-4'>
        {/* Glass-morphism Card */}
        <div className='relative w-full max-w-md animate-fade-in-up space-y-6 rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl md:rounded-3xl md:p-10'>
          {/* Logo - Top Right */}
          <div className='absolute -right-3 -top-3 md:-right-4 md:-top-4'>
            <Image
              src='/pds_logo.webp'
              alt='Photo Delivery Scheduler Logo'
              width={80}
              height={80}
              className='h-16 w-16 md:h-20 md:w-20'
              priority
            />
          </div>

          {/* Title */}
          <div className='space-y-3 text-center'>
            <h1 className='text-3xl font-bold text-white md:text-5xl'>
              <AuroraText
                colors={['#38BDF8', '#3B82F6', '#8B5CF6', '#EC4899']}
                speed={1.2}>
                Photo Delivery Scheduler
              </AuroraText>
            </h1>
            <p className='text-base text-white/90 md:text-lg'>
              Helps tracking your photography delivery deadlines
            </p>
          </div>

          {/* Sign In Button with Google Logo */}
          <Button
            onClick={handleSignIn}
            disabled={isLoading}
            className=' cursor-pointer w-full bg-indigo-600/60 text-base text-white hover:bg-indigo-700 disabled:opacity-50 md:text-lg'
            size='lg'>
            {isLoading ? (
              <>
                <Loader2 className='mr-2 h-5 w-5 animate-spin' />
                Signing in...
              </>
            ) : (
              <>
                <GoogleLogo className='mr-2 h-5 w-5' />
                Sign in with Google
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Google Logo SVG Component
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox='0 0 24 24'
      xmlns='http://www.w3.org/2000/svg'
      aria-hidden='true'>
      <path
        d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
        fill='#4285F4'
      />
      <path
        d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
        fill='#34A853'
      />
      <path
        d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
        fill='#FBBC05'
      />
      <path
        d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
        fill='#EA4335'
      />
    </svg>
  );
}
