import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * AppChip — Layer 6.10.
 * Two flavors:
 *  - Static (rendered as <span>, no interactivity) — used by SourceChip, FinishingChip.
 *  - Interactive (rendered as <button>) — used by FilterChip in chip groups.
 */
const chipVariants = cva(
  [
    'inline-flex items-center gap-1 rounded-sm px-3 py-1',
    'text-caption font-medium',
    'transition-colors',
  ].join(' '),
  {
    variants: {
      tone: {
        neutral: 'bg-stone-100 text-stone-700',
        terracotta:
          'bg-terracotta-100 text-terracotta-800 [&_svg]:text-terracotta-700',
        'source-developer':
          'bg-indigo-50 text-[color:var(--color-source-developer)] [&_svg]:text-[color:var(--color-source-developer)]',
        'source-owner':
          'bg-green-50 text-[color:var(--color-source-owner)] [&_svg]:text-[color:var(--color-source-owner)]',
        'source-intermediary':
          'bg-amber-50 text-[color:var(--color-source-intermediary)] [&_svg]:text-[color:var(--color-source-intermediary)]',
        'finishing-no-finish':
          'bg-stone-100 text-[color:var(--color-finishing-no-finish)]',
        'finishing-pre-finish':
          'bg-amber-50 text-[color:var(--color-finishing-pre-finish)]',
        'finishing-full-finish':
          'bg-green-50 text-[color:var(--color-finishing-full-finish)]',
        'finishing-owner-renovated':
          'bg-blue-50 text-[color:var(--color-finishing-owner-renovated)]',
      },
      interactive: {
        true: 'cursor-pointer hover:opacity-80',
        false: '',
      },
      selected: {
        true: 'ring-2 ring-terracotta-600',
        false: '',
      },
    },
    defaultVariants: {
      tone: 'neutral',
      interactive: false,
      selected: false,
    },
  },
);

export interface AppChipProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof chipVariants> {
  icon?: ReactNode;
  asStatic?: boolean;
}

export const AppChip = forwardRef<HTMLButtonElement, AppChipProps>(
  ({ className, tone, interactive, selected, icon, children, asStatic, ...rest }, ref) => {
    if (asStatic) {
      return (
        <span className={cn(chipVariants({ tone, interactive: false, selected }), className)}>
          {icon}
          <span>{children}</span>
        </span>
      );
    }
    return (
      <button
        ref={ref}
        type="button"
        className={cn(chipVariants({ tone, interactive: interactive ?? true, selected }), className)}
        aria-pressed={selected ?? undefined}
        {...rest}
      >
        {icon}
        <span>{children}</span>
      </button>
    );
  },
);

AppChip.displayName = 'AppChip';
