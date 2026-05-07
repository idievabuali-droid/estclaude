import type { Metadata } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
});

// Source Serif 4 — editorial display serif paired with Inter for the
// premium-real-estate brand voice (Knight Frank, The Modern House,
// Sotheby's territory). Adobe's open-source serif designed for both
// print and screen; reads more editorial than Lora's bookish curves
// while staying eminently legible in Cyrillic. Strong Tajik diacritic
// coverage. (Fraunces + Newsreader were first choices but neither
// has a Cyrillic subset on Google Fonts.) Italic carries the H1
// accent clause "проверенные вручную" with real editorial weight.
const display = Source_Serif_4({
  subsets: ['latin', 'cyrillic'],
  weight: ['500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-display',
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
    <html className={`${inter.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
