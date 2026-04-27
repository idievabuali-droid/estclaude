'use client';

import { forwardRef, useId, useState, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface AppTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  errorText?: string;
  showCounter?: boolean;
}

/**
 * AppTextarea — Layer 6.7.
 * Min 4 rows. Counter when maxLength is set.
 */
export const AppTextarea = forwardRef<HTMLTextAreaElement, AppTextareaProps>(
  (
    {
      className,
      label,
      helperText,
      errorText,
      id,
      maxLength,
      showCounter,
      defaultValue,
      value,
      onChange,
      ...rest
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const hasError = Boolean(errorText);
    const initialLen =
      typeof value === 'string'
        ? value.length
        : typeof defaultValue === 'string'
          ? defaultValue.length
          : 0;
    const [count, setCount] = useState(initialLen);

    return (
      <div className="flex flex-col gap-2">
        {label ? (
          <label htmlFor={inputId} className="text-meta font-medium text-stone-700">
            {label}
          </label>
        ) : null}
        <textarea
          ref={ref}
          id={inputId}
          rows={4}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          onChange={(e) => {
            setCount(e.target.value.length);
            onChange?.(e);
          }}
          className={cn(
            'min-h-[6rem] rounded-md border bg-white px-4 py-3 text-body text-stone-900 outline-none',
            'placeholder:text-stone-400',
            hasError ? 'border-semantic-error' : 'border-stone-200',
            'focus:border-terracotta-600',
            className,
          )}
          aria-invalid={hasError || undefined}
          aria-describedby={helperText || errorText ? `${inputId}-help` : undefined}
          {...rest}
        />
        <div className="flex items-center justify-between gap-2">
          {(helperText && !hasError) || errorText ? (
            <span
              id={`${inputId}-help`}
              className={cn('text-meta', hasError ? 'text-semantic-error' : 'text-stone-500')}
            >
              {hasError ? errorText : helperText}
            </span>
          ) : (
            <span />
          )}
          {showCounter && maxLength ? (
            <span className="text-caption tabular-nums text-stone-500">
              {count} / {maxLength}
            </span>
          ) : null}
        </div>
      </div>
    );
  },
);

AppTextarea.displayName = 'AppTextarea';
