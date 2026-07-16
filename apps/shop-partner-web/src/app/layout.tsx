import type { Metadata } from 'next';
import { Lexend, Manrope } from 'next/font/google';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['400', '500', '600', '700', '800'],
});

const lexend = Lexend({
  subsets: ['latin'],
  variable: '--font-lexend',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'FitOra Shop Partner',
  description: 'Manage products, inventory, and orders for your FitOra shop.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${lexend.variable} min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  );
}
