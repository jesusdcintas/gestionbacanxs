import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-[#0a0a0a] font-bold hover:bg-accent-hover disabled:bg-accent/40 disabled:text-[#0a0a0a]/60',
  secondary:
    'bg-transparent border border-border-strong text-text-primary hover:bg-surface-hover hover:border-[#f5f5f0]/40 disabled:opacity-50',
  ghost:
    'bg-transparent text-text-primary hover:bg-surface-hover disabled:text-text-secondary',
  danger:
    'bg-transparent border border-danger text-danger hover:bg-danger-bg disabled:opacity-50',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base',
};

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      disabled={isDisabled}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
