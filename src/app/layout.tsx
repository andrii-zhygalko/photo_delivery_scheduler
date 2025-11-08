import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import { Toaster } from 'sonner';
import { PWARegister } from '@/components/pwa-register';
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${poetsenOne.variable} antialiased`}>
        <PWARegister />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
