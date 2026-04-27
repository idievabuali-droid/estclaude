import { forwardRef, useId, type SelectHTMLAttributes, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AppSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  errorText?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  children?: ReactNode;
}

/**
 * AppSelect — Layer 6.5.
 * V1: native <select> styled to match AppInput. The mobile-bottom-sheet
 * upgrade described in DS §6.5 is deferred to a later session — native
 * select on mobile is genuinely good (full-screen wheel, accessible).
 */
export const AppSelect = forwardRef<HTMLSelectElement, AppSelectProps>(
  ({ className, label, helperText, errorText, options, placeholder, id, ...rest }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const hasError = Boolean(errorText);

    return (
      <div className="flex flex-col gap-2">
        {label ? (
          <label htmlFor={selectId} className="text-meta font-medium text-stone-700">
            {label}
          </label>
        ) : null}
        <div
          className={cn(
            'relative flex h-11 items-center rounded-md border bg-white px-4',
            hasError ? 'border-semantic-error' : 'border-stone-200',
            'focus-within:border-terracotta-600',
          )}
        >
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'h-full w-full appearance-none bg-transparent pr-6 text-body text-stone-900 outline-none',
              className,
            )}
            aria-invalid={hasError || undefined}
            aria-describedby={helperText || errorText ? `${selectId}-help` : undefined}
            {...rest}
          >
            {placeholder ? (
              <option value="" disabled>
                {placeholder}
              </option>
            ) : null}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-4 size-4 text-stone-500"
            aria-hidden
          />
        </div>
        {(helperText && !hasError) || errorText ? (
          <span
            id={`${selectId}-help`}
            className={cn('text-meta', hasError ? 'text-semantic-error' : 'text-stone-500')}
          >
            {hasError ? errorText : helperText}
          </span>
        ) : null}
      </div>
    );
  },
);

AppSelect.displayName = 'AppSelect';
