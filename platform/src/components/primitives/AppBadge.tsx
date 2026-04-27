import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * AppBadge — Layer 6.9.
 * Used for short non-interactive labels (verification tier, status).
 * Always rendered with an icon + text per Layer 2.4 design rules.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-sm px-2 py-1 text-caption font-medium',
  {
    variants: {
      variant: {
        'tier-1':
          'bg-stone-100 text-[color:var(--color-badge-tier-1)] [&_svg]:text-[color:var(--color-badge-tier-1)]',
        'tier-2':
          'bg-blue-50 text-[color:var(--color-badge-tier-2)] [&_svg]:text-[color:var(--color-badge-tier-2)]',
        'tier-3':
          'bg-green-50 text-[color:var(--color-badge-tier-3)] [&_svg]:text-[color:var(--color-badge-tier-3)]',
        'tier-developer':
          'bg-amber-50 text-[color:var(--color-badge-tier-developer)] [&_svg]:text-[color:var(--color-badge-tier-developer)]',
        neutral: 'bg-stone-100 text-stone-700 [&_svg]:text-stone-600',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

export interface AppBadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  icon?: ReactNode;
}

export const AppBadge = forwardRef<HTMLSpanElement, AppBadgeProps>(
  ({ className, variant, icon, children, ...rest }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...rest}>
      {icon}
      <span>{children}</span>
    </span>
  ),
);

AppBadge.displayName = 'AppBadge';
