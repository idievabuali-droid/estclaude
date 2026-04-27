import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const AppCard = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-md border border-stone-200 bg-white p-4 md:p-5',
        'transition-colors',
        className,
      )}
      {...rest}
    />
  ),
);
AppCard.displayName = 'AppCard';

export const AppCardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...rest }, ref) => (
    <div ref={ref} className={cn('mb-3 flex flex-col gap-1', className)} {...rest} />
  ),
);
AppCardHeader.displayName = 'AppCardHeader';

export const AppCardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...rest }, ref) => (
    <h3 ref={ref} className={cn('text-h3 font-semibold text-stone-900', className)} {...rest} />
  ),
);
AppCardTitle.displayName = 'AppCardTitle';

export const AppCardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...rest }, ref) => (
    <p ref={ref} className={cn('text-meta text-stone-500', className)} {...rest} />
  ),
);
AppCardDescription.displayName = 'AppCardDescription';

export const AppCardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...rest }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-3', className)} {...rest} />
  ),
);
AppCardContent.displayName = 'AppCardContent';

export const AppCardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn('mt-4 flex items-center gap-3 border-t border-stone-200 pt-4', className)}
      {...rest}
    />
  ),
);
AppCardFooter.displayName = 'AppCardFooter';
