import type { SelectHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export function Select({ className, label, id, error, children, ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label ? (
        <label
          className="block text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary"
          htmlFor={id}
        >
          {label}
        </label>
      ) : null}
      <div className="relative">
        <select
          className={cn(
            'w-full appearance-none border border-border bg-surface px-3 py-2 pr-10 text-sm text-text-primary outline-none transition-colors duration-150 focus:border-accent focus:ring-1 focus:ring-accent',
            error ? 'border-danger focus:border-danger focus:ring-[#e2433f]' : '',
            className,
          )}
          id={id}
          {...props}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-text-secondary">
          ▾
        </span>
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
