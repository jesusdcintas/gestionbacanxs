import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface StampLabelProps {
  children: ReactNode;
  rotate?: 'left' | 'right' | 'none';
  variant?: 'outline' | 'accent' | 'danger';
  className?: string;
  as?: 'span' | 'div';
}

/**
 * Etiqueta inclinada con estética de sello.
 * Úsar con moderación: máximo 2-3 elementos rotados visibles por pantalla.
 */
export function StampLabel({
  children,
  rotate = 'left',
  variant = 'outline',
  className,
  as: Tag = 'span',
}: StampLabelProps) {
  const rotateStyle =
    rotate === 'left'
      ? { transform: 'rotate(-1.5deg)' }
      : rotate === 'right'
        ? { transform: 'rotate(1.5deg)' }
        : undefined;

  const variantClass =
    variant === 'accent'
      ? 'bg-accent text-[#0a0a0a] border border-accent'
      : variant === 'danger'
        ? 'bg-transparent text-danger border border-danger'
        : 'bg-transparent text-text-primary border-[1.5px] border-[#f5f5f0]';

  return (
    <Tag
      className={cn(
        'inline-flex items-center px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] leading-none',
        variantClass,
        className,
      )}
      style={{
        fontFamily: '"Archivo Black", sans-serif',
        ...rotateStyle,
      }}
    >
      {children}
    </Tag>
  );
}

export default StampLabel;
