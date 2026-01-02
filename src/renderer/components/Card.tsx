import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  hover = false,
  onClick,
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const hoverClass = hover ? 'hover:shadow-lg transition-shadow cursor-pointer' : '';
  const clickable = onClick ? 'cursor-pointer' : '';

  return (
    <div
      className={`bg-white rounded-lg shadow ${paddingClasses[padding as keyof typeof paddingClasses]} ${hoverClass} ${clickable} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
