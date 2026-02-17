import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = false,
}) => {
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-6 ${
        hover ? 'transition-shadow hover:shadow-lg' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
