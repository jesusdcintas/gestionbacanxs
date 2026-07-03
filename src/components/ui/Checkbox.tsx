import type { InputHTMLAttributes, ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
}

export function Checkbox({ className, label, id, ...props }: CheckboxProps) {
  return (
    <label className={cn('inline-flex items-center gap-2 text-sm text-text-primary', className)} htmlFor={id}>
      <span className="relative inline-flex h-4 w-4 items-center justify-center">
        <input
          id={id}
          type="checkbox"
          className="peer h-4 w-4 appearance-none border border-border-strong bg-surface outline-none transition-colors checked:border-accent checked:bg-accent focus:ring-1 focus:ring-accent"
          {...props}
        />
        <Check className="pointer-events-none absolute h-3 w-3 text-[#0a0a0a] opacity-0 peer-checked:opacity-100" strokeWidth={3} />
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  );
}
