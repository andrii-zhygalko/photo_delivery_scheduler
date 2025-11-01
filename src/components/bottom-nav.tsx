'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Camera, Archive, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  {
    title: 'Shoots',
    href: '/items',
    icon: Camera,
    description: 'View and manage photo shoots',
  },
  {
    title: 'Archived',
    href: '/archived',
    icon: Archive,
    description: 'View archived deliveries',
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'Configure your preferences',
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t"
      aria-label="Bottom navigation"
    >
      <div
        className="flex items-center justify-around py-2 px-1"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 min-w-0 flex-1 min-h-[44px] justify-center',
                'hover:bg-accent hover:text-accent-foreground hover:scale-105 active:scale-95 touch-manipulation',
                isActive
                  ? 'text-foreground bg-accent'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label={`Navigate to ${item.title}: ${item.description}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="text-xs font-medium truncate leading-tight">
                {item.title}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
