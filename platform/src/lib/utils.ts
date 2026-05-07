import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Custom tailwind-merge configuration. Tailwind v4 lets us define
 * font-size utilities via `--text-*` CSS variables (see globals.css):
 * `--text-display`, `--text-h1`, `--text-h2`, `--text-h3`, `--text-body`,
 * `--text-meta`, `--text-caption`. These render as `text-display`,
 * `text-h1`, etc. — they're font-size utilities, NOT text-color.
 *
 * tailwind-merge's stock config doesn't know about them: it sees a
 * class like `text-body` and assumes it lives in the same conflict
 * group as `text-white` (the color group). Result: when AppButton
 * composes `bg-stone-900 text-white` (variant) + `h-11 px-5 text-body`
 * (size), twMerge silently drops `text-white` thinking it was
 * superseded by `text-body`. The button renders dark text on dark
 * background — the wide-black-slab Связаться bug.
 *
 * Fix: register the custom utilities with the `font-size` class group
 * so twMerge keeps them isolated from text-color. Now both
 * `text-white text-body` survive the merge intact.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        { text: ['display', 'h1', 'h2', 'h3', 'body', 'meta', 'caption'] },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
