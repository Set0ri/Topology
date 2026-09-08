import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ElevatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  elevation?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  className?: string;
  glowColor?: string;
}

export const ElevatedCard: React.FC<ElevatedCardProps> = ({
  children,
  elevation = 'md',
  interactive = false,
  className,
  glowColor,
  style,
  ...props
}) => {
  const elevationStyles = {
    sm: 'shadow-elevated-sm',
    md: 'shadow-elevated-md',
    lg: 'shadow-elevated-lg',
  }[elevation];

  const dynamicGlowStyle = glowColor ? {
    boxShadow: `0 8px 30px -4px ${glowColor}, 0 4px 12px -2px rgba(0, 0, 0, 0.15)`,
  } : undefined;

  return (
    <div
      className={twMerge(
        clsx(
          'relative rounded-2xl border-none outline-none',
          'bg-cat-latte-base/90 dark:bg-cat-mocha-base/85',
          'text-cat-latte-text dark:text-cat-mocha-text',
          'backdrop-blur-xl',
          elevationStyles,
          interactive && 'transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-elevated-lg cursor-pointer',
          className
        )
      )}
      style={{ ...dynamicGlowStyle, ...style }}
      {...props}
    >
      {children}
    </div>
  );
};
