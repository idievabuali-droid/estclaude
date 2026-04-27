import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base — Layer 5 (radius), Layer 3 (semibold), Layer 4 (44x44 hit area)
  [
    'inline-flex items-center justify-center gap-2',
    'rounded-md font-semibold',
    'transition-colors',
    'disabled:pointer-events-none disabled:opacity-40',
    'focus-visible:outline-2 focus-visible:outline-terracotta-600 focus-visible:outline-offset-2',
  ].join(' '),
  {
    variants: {
      variant: {
        primary:
          'bg-terracotta-600 text-white hover:bg-terracotta-700 active:bg-terracotta-800',
        secondary:
          'border border-stone-300 bg-white text-stone-900 hover:bg-stone-100',
        ghost: 'bg-transparent text-stone-700 hover:bg-stone-100',
        destructive:
          'border border-semantic-error bg-white text-semantic-error hover:bg-stone-50',
      },
      size: {
        sm: 'h-9 px-4 text-meta',
        md: 'h-11 px-5 text-body',
        lg: 'h-12 px-5 text-body',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface AppButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...rest}
      >
        {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {children}
      </button>
    );
  },
);

AppButton.displayName = 'AppButton';
