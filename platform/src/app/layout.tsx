import type { Metadata } from 'next';
import { Inter, Lora } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
});

// Lora — warm serif paired with Inter for the editorial-boutique
// brand voice. Applied only to the home page H1 and the SiteHeader
// "ЖК.tj" wordmark for now; rest of the platform stays on Inter.
// Strong Cyrillic support including Tajik diacritics. Single weight
// (600 semibold) to keep bundle small; expand only when other
// weights are needed.
const lora = Lora({
  subsets: ['latin', 'cyrillic'],
  weight: ['600'],
  display: 'swap',
  variable: '--font-lora',
});

export const metadata: Metadata = {
  title: {
    default: 'Real Estate Platform',
    template: '%s — Real Estate Platform',
  },
  description: 'New-build apartments in Vahdat',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={`${inter.variable} ${lora.variable}`}>
      <body>{children}</body>
    </html>
  );
}
