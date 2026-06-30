import type { InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ className, label, id, error, ...props }: InputProps) {
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
      <input
        className={cn(
          'w-full border border-border bg-[#0a0a0a] px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary transition-colors duration-150 outline-none focus:border-accent focus:ring-1 focus:ring-accent',
          error ? 'border-danger focus:border-danger focus:ring-[#e2433f]' : '',
          className,
        )}
        id={id}
        {...props}
      />
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
