import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface AppInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorText?: string;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
}

export const AppInput = forwardRef<HTMLInputElement, AppInputProps>(
  (
    { className, label, helperText, errorText, leftSlot, rightSlot, id, type = 'text', ...rest },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const hasError = Boolean(errorText);

    return (
      <div className="flex flex-col gap-2">
        {label ? (
          <label htmlFor={inputId} className="text-meta font-medium text-stone-700">
            {label}
          </label>
        ) : null}
        <div
          className={cn(
            'flex h-11 items-center rounded-md border bg-white px-4',
            hasError ? 'border-semantic-error' : 'border-stone-200',
            'focus-within:border-terracotta-600',
          )}
        >
          {leftSlot ? <span className="mr-2 flex shrink-0 text-stone-500">{leftSlot}</span> : null}
          <input
            ref={ref}
            id={inputId}
            type={type}
            className={cn(
              'h-full w-full bg-transparent text-body text-stone-900 outline-none',
              'placeholder:text-stone-400',
              type === 'number' ? 'tabular-nums' : '',
              className,
            )}
            aria-invalid={hasError || undefined}
            aria-describedby={
              helperText || errorText ? `${inputId}-help` : undefined
            }
            {...rest}
          />
          {rightSlot ? <span className="ml-2 flex shrink-0 text-stone-500">{rightSlot}</span> : null}
        </div>
        {(helperText && !hasError) || errorText ? (
          <span
            id={`${inputId}-help`}
            className={cn(
              'text-meta',
              hasError ? 'text-semantic-error' : 'text-stone-500',
            )}
          >
            {hasError ? errorText : helperText}
          </span>
        ) : null}
      </div>
    );
  },
);

AppInput.displayName = 'AppInput';
