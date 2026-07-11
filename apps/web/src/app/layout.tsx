import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Geist_Mono } from 'next/font/google';
import { AppProviders } from '@/providers/app-providers';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Fitora — Book Sports Venues, Trainers & Events',
  description: 'Book sports courts, join training programs, and find trainers near you — like Playo, built for India.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
