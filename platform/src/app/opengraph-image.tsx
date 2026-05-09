import { ImageResponse } from 'next/og';

/**
 * Root OpenGraph image — rendered as a 1200×630 PNG at the edge by
 * Next 16's `next/og` runtime. Used by every page that doesn't supply
 * its own `opengraph-image.tsx` override.
 *
 * Design: editorial-luxury wordmark on warm stone canvas. Same visual
 * grammar as the site (terracotta-700 + stone palette + serif). One
 * eyebrow, one wordmark, one tagline — no clutter.
 *
 * Why JSX-rendered and not a static PNG file: lets us tweak copy +
 * colours without re-exporting an asset, and the response is cached
 * (Vercel's edge cache + browser cache) so it's effectively free at
 * unfurl time. Same approach Vercel's own marketing pages use.
 *
 * Why nodejs runtime, not edge: the `next/og` bundle (font + canvas
 * deps) ships at ~1.06 MB which exceeds Vercel's 1 MB edge-function
 * limit on Hobby. Node serverless allows 50 MB. The cold-start cost
 * is sub-second and amortises over the cache TTL.
 */
export const runtime = 'nodejs';
export const alt = 'Vafo.tj — квартиры и новостройки в Таджикистане';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          // Stone-50 canvas with a soft terracotta-50 wash at the top
          // so the image doesn't read as a flat slab. Same kind of warm
          // brand surface the site itself uses.
          background:
            'linear-gradient(180deg, #fdf4f0 0%, #fafaf9 38%, #fafaf9 100%)',
          fontFamily: 'serif',
        }}
      >
        {/* Eyebrow — uppercase tracked, stone-500 */}
        <div
          style={{
            fontSize: 24,
            color: '#78716c',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontWeight: 500,
            marginBottom: 20,
          }}
        >
          Квартиры в Таджикистане
        </div>

        {/* Primary wordmark — Vafo.tj, large, terracotta-700, serif.
            Sized at 180px so the 7-character wordmark fits comfortably
            with margin on a 1200px canvas (200+ overflows when the .tj
            suffix is included). */}
        <div
          style={{
            fontSize: 180,
            color: '#9a3412',
            fontWeight: 600,
            letterSpacing: '0.005em',
            lineHeight: 1,
            marginBottom: 28,
          }}
        >
          Vafo.tj
        </div>

        {/* Thin underline accent — terracotta, narrow */}
        <div
          style={{
            width: 96,
            height: 2,
            backgroundColor: '#c2410c',
            marginBottom: 36,
          }}
        />

        {/* Tagline — italic, stone-700, classical pairing */}
        <div
          style={{
            fontSize: 32,
            color: '#44403c',
            fontStyle: 'italic',
            fontWeight: 500,
            letterSpacing: '0.005em',
          }}
        >
          Продавцы проверены вручную
        </div>
      </div>
    ),
    { ...size },
  );
}
