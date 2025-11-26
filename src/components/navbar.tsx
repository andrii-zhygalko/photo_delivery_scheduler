'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';

interface NavbarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  // Ref to track if navigation was triggered by browser back/forward button
  const isBack = useRef(false);

  // Listen for browser back/forward button events
  useEffect(() => {
    const onPopState = () => {
      isBack.current = true;
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Manually handle scroll restoration on pathname changes
  useEffect(() => {
    // Only scroll to top if this is a forward navigation (not back button)
    if (!isBack.current) {
      window.scrollTo(0, 0);
    }
    // Reset flag for next navigation
    isBack.current = false;
  }, [pathname]);

  const links = [
    { href: '/items', label: 'Shoots' },
    { href: '/archived', label: 'Archive' },
    { href: '/settings', label: 'Settings' },
  ];

  const isActive = (href: string) => pathname === href;

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (user.name) {
      return user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <header className='sticky top-0 z-50 w-full border-b border-border/40 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
      {/* Gradient overlay - top to bottom, fading to transparent */}
      <div className='absolute inset-0 bg-gradient-to-b from-violet-300 via-purple-200 to-violet-100 dark:from-violet-950/30 dark:via-purple-950/20 dark:to-violet-950/30 pointer-events-none' />

      <div className='container relative px-4 py-3 mx-auto'>
        <div className='flex items-center justify-between'>
          {/* Logo and Title */}
          <div className='flex items-center gap-1'>
            <Link
              href='/items'
              scroll={false}
              className='transition-transform hover:scale-105'
              aria-label='Go to home'>
              <Image
                src='/pds_logo_256.webp'
                alt='Photo Delivery Scheduler Logo'
                width={40}
                height={40}
                className='h-10 w-10'
              />
            </Link>
            <h1 className='text-2xl font-bold tracking-tight text-foreground/85 font-[family-name:var(--font-poetsen)]'>
              <Link
                href='/items'
                scroll={false}
                className='hover:text-primary transition-colors'>
                Photo Delivery
              </Link>
            </h1>
          </div>

          {/* Desktop Navigation - hidden on mobile */}
          <div className='hidden md:flex gap-4'>
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                scroll={false}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-primary',
                  isActive(link.href)
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                )}
                aria-current={isActive(link.href) ? 'page' : undefined}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* User Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className='rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
                aria-label='User menu'>
                <Avatar className='h-10 w-10 ring-2 ring-primary/10 ring-offset-2 ring-offset-background'>
                  <AvatarImage
                    src={user.image || undefined}
                    alt={`${
                      user.name || user.email || 'User'
                    }'s profile picture`}
                  />
                  <AvatarFallback
                    className='bg-gradient-to-br from-primary/10 to-primary/5 text-primary'
                    aria-label={`${
                      user.name || user.email || 'User'
                    } (initials)`}>
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-56'>
              <div className='px-2 py-1.5 text-sm'>
                <p className='font-medium'>{user.name}</p>
                <p className='text-xs text-muted-foreground'>{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: '/' })}
                className='cursor-pointer'>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
