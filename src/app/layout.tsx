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
  openGraph: {
    title: 'Photo Delivery Scheduler',
    description: 'Web app to help photographers track delivery deadlines',
    url: 'https://pds.devino.dev',
    siteName: 'Photo Delivery Scheduler',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Photo Delivery Scheduler',
    description: 'Web app to help photographers track delivery deadlines',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  colorScheme: 'light dark',
};

// Blocking script to apply view density preference before React hydrates (prevents FOUC)
const viewDensityScript = `(function(){try{var d=localStorage.getItem('pds:view-density');if(d==='compact'){document.documentElement.classList.add('view-compact')}else if(d==='list'){document.documentElement.classList.add('view-list')}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        {/* View density preference script - must run before React hydrates */}
        <script dangerouslySetInnerHTML={{ __html: viewDensityScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${poetsenOne.variable} antialiased`}>
        <ThemeProvider>
          <PWARegister />
          {children}
          <Toaster position='top-center' />
        </ThemeProvider>
      </body>
    </html>
  );
}
