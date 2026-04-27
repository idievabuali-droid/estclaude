'use client';

import { forwardRef, createContext, useContext, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface RadioContextValue {
  name: string;
  value: string;
  onValueChange: (value: string) => void;
}

const RadioContext = createContext<RadioContextValue | null>(null);

export interface AppRadioGroupProps {
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
  label?: string;
}

export function AppRadioGroup({
  name,
  value,
  onValueChange,
  children,
  className,
  label,
}: AppRadioGroupProps) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex flex-col gap-2', className)}>
      {label ? <span className="text-meta font-medium text-stone-700">{label}</span> : null}
      <RadioContext.Provider value={{ name, value, onValueChange }}>
        {children}
      </RadioContext.Provider>
    </div>
  );
}

export interface AppRadioProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'name'> {
  value: string;
  label?: ReactNode;
  description?: ReactNode;
}

export const AppRadio = forwardRef<HTMLInputElement, AppRadioProps>(
  ({ className, label, description, id, value, ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const ctx = useContext(RadioContext);
    if (!ctx) throw new Error('AppRadio must be inside AppRadioGroup');

    const checked = ctx.value === value;

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
            type="radio"
            name={ctx.name}
            value={value}
            checked={checked}
            onChange={() => ctx.onValueChange(value)}
            className="peer absolute inset-0 size-5 cursor-pointer appearance-none rounded-full border border-stone-300 bg-white checked:border-terracotta-600 focus-visible:outline-2 focus-visible:outline-terracotta-600 focus-visible:outline-offset-2"
            {...rest}
          />
          <span className="pointer-events-none size-2.5 rounded-full bg-terracotta-600 opacity-0 peer-checked:opacity-100" />
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

AppRadio.displayName = 'AppRadio';
