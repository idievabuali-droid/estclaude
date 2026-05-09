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

// Hardcoded prod URL for the metadata base. We deliberately don't read
// NEXT_PUBLIC_SITE_URL here because Next.js needs `metadataBase` at build
// time and treating undefined as "localhost" would break OG card unfurls
// in production. The env var still controls SITE_BASE elsewhere — this
// is just the canonical brand domain for SEO + social previews.
const SITE_URL = 'https://vafo.tj';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Vafo.tj — квартиры и новостройки в Таджикистане',
    template: '%s — Vafo.tj',
  },
  description:
    'Квартиры и новостройки по Таджикистану — продавцы проверены вручную, реальные фото со стройки и ремонта.',
  icons: {
    // Modern browsers prefer SVG; older fall back to .ico but SVG-only
    // is acceptable for the V1 launch (Chromium / Safari / Firefox all
    // support it). Add a raster .ico later if analytics show legacy
    // browsers using the site.
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    type: 'website',
    siteName: 'Vafo.tj',
    locale: 'ru_RU',
    url: SITE_URL,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={`${inter.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
