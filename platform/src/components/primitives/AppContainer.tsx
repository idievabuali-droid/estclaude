import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * AppContainer — applies the Layer 4.3 container rules (max 1200px,
 * progressive horizontal padding). Wrap every page section in this.
 */
export function AppContainer({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[var(--container-max)]',
        'px-4 md:px-5 lg:px-6',
        className,
      )}
      {...rest}
    />
  );
}
