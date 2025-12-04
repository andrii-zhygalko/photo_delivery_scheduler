import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import { Toaster } from 'sonner';
import { PWARegister } from '@/components/pwa-register';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const poetsenOne = localFont({
  src: '../../public/fonts/PoetsenOne-Regular.ttf',
  variable: '--font-poetsen',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Photo Delivery Scheduler',
  description: 'Web app to help photographers track delivery deadlines',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PhotoDelivery',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  // Tell Samsung Internet that this site supports dark mode natively.
  // Without this, Samsung Internet ignores prefers-color-scheme and applies
  // its own forced dark mode transformation instead of our CSS dark theme.
  // See: https://developer.samsung.com/internet/blog/en/2020/12/15/dark-mode-in-samsung-internet
  colorScheme: 'light dark',
};

/**
 * Blocking script for view density preference
 *
 * This script runs BEFORE React hydrates to:
 * 1. Read the user's saved view density preference from localStorage
 * 2. Add the 'view-compact' class to <html> if preference is 'compact'
 * 3. Add the 'view-list' class to <html> if preference is 'list'
 *
 * WHY THIS APPROACH:
 * - Script executes synchronously before first paint (<1ms)
 * - CSS applies immediately based on the class
 * - No hydration mismatch (server and client see same CSS class)
 * - No Flash of Unstyled Content (FOUC)
 *
 * This is an industry-standard pattern used by:
 * - next-themes (dark mode)
 * - Tailwind CSS dark mode
 * - Many production apps
 */
const viewDensityScript = `(function(){try{var d=localStorage.getItem('pds:view-density');if(d==='compact'){document.documentElement.classList.add('view-compact')}else if(d==='list'){document.documentElement.classList.add('view-list')}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* View density preference script - must run before React hydrates */}
        <script
          dangerouslySetInnerHTML={{ __html: viewDensityScript }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${poetsenOne.variable} antialiased`}>
        <ThemeProvider>
          <PWARegister />
          {children}
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
