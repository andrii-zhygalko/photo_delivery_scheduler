'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

  const links = [
    { href: '/items', label: 'Shoots' },
    { href: '/archived', label: 'Archived' },
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
    <nav
      aria-label='Main navigation'
      className='sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
      <div className='container px-4 flex h-16 items-center justify-between'>
        <div className='flex items-center gap-6'>
          <Link href='/items' className='text-lg font-semibold'>
            Photo Delivery
          </Link>

          <div className='hidden md:flex gap-4'>
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
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
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className='rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
              aria-label='User menu'>
              <Avatar>
                <AvatarImage
                  src={user.image || undefined}
                  alt={`${user.name || user.email || 'User'}'s profile picture`}
                />
                <AvatarFallback
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
            <div className='md:hidden'>
              {links.map(link => (
                <DropdownMenuItem key={link.href} asChild>
                  <Link href={link.href}>{link.label}</Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </div>
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: '/' })}
              className='cursor-pointer'>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
