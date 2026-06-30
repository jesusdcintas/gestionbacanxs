import type { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tilt?: 'left' | 'right' | 'none';
}

export function Card({ className, tilt = 'none', style, ...props }: CardProps) {
  const tiltStyle =
    tilt === 'left'
      ? { transform: 'rotate(-0.6deg)' }
      : tilt === 'right'
        ? { transform: 'rotate(0.6deg)' }
        : undefined;

  return (
    <div
      className={cn(
        'border border-border bg-surface p-5 transition-colors hover:border-border-strong',
        className,
      )}
      style={{ ...tiltStyle, ...style }}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-b border-border px-5 py-4 -mx-5 -mt-5 mb-5', className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('', className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-base uppercase tracking-tight text-text-primary', className)}
      style={{ fontFamily: '"Archivo Black", sans-serif' }}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-text-secondary', className)} {...props} />;
}
