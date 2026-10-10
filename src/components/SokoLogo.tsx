import React from 'react';

export interface SokoLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  rounded?: string;
  ariaLabel?: string;
}

const sizeMap: Record<string, string> = {
  xs: 'w-6 h-6 rounded-md',
  sm: 'w-8 h-8 rounded-lg',
  md: 'w-10 h-10 rounded-xl',
  lg: 'w-12 h-12 rounded-xl',
  xl: 'w-16 h-16 rounded-2xl',
  '2xl': 'w-20 h-20 rounded-3xl',
};

export const SokoLogo: React.FC<SokoLogoProps> = ({
  className = '',
  size = 'md',
  rounded,
  ariaLabel = 'SOKO',
}) => {
  const sizeClasses = sizeMap[size] || sizeMap.md;

  return (
    <img
      src="/soko-logo.png"
      alt={ariaLabel}
      width={512}
      height={512}
      draggable={false}
      className={`shrink-0 select-none bg-white object-contain ring-1 ring-slate-200 transition-transform group-hover:scale-102 ${sizeClasses} ${rounded ?? ''} ${className}`}
    />
  );
};

export const SokoLockup: React.FC<{ className?: string; ariaLabel?: string }> = ({
  className = 'h-8',
  ariaLabel = 'SOKO.ae',
}) => (
  <img
    src="/soko-lockup.png"
    alt={ariaLabel}
    width={720}
    height={156}
    draggable={false}
    className={`w-auto shrink-0 select-none ${className}`}
  />
);

export default SokoLogo;
