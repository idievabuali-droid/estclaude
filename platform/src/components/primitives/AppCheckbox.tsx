import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AppCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  description?: ReactNode;
}

/**
 * AppCheckbox — Layer 6.6.
 * 20×20 visible square inside a 44×44 hit area (via padding on the wrapper label).
 */
export const AppCheckbox = forwardRef<HTMLInputElement, AppCheckboxProps>(
  ({ className, label, description, id, checked, defaultChecked, ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <label
        htmlFor={inputId}
        className={cn(
          'flex cursor-pointer items-start gap-3 py-2',
          rest.disabled ? 'cursor-not-allowed opacity-50' : '',
          className,
        )}
      >
        <span className="relative inline-flex size-5 shrink-0 items-center justify-center">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            checked={checked}
            defaultChecked={defaultChecked}
            className="peer absolute inset-0 size-5 cursor-pointer appearance-none rounded-sm border border-stone-300 bg-white checked:border-terracotta-600 checked:bg-terracotta-600 focus-visible:outline-2 focus-visible:outline-terracotta-600 focus-visible:outline-offset-2"
            {...rest}
          />
          <Check
            className="pointer-events-none size-3.5 text-white opacity-0 peer-checked:opacity-100"
            aria-hidden
          />
        </span>
        {label || description ? (
          <span className="flex flex-col gap-0.5">
            {label ? <span className="text-body text-stone-900">{label}</span> : null}
            {description ? <span className="text-meta text-stone-500">{description}</span> : null}
          </span>
        ) : null}
      </label>
    );
  },
);

AppCheckbox.displayName = 'AppCheckbox';
