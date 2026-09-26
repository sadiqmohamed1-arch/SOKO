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
  ariaLabel = 'SOKO Logo',
}) => {
  const sizeClasses = sizeMap[size] || sizeMap.md;
  const customRounded = rounded ?? '';

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden select-none transition-transform group-hover:scale-102 ${sizeClasses} ${customRounded} ${className}`}
    >
      <svg
        viewBox="0 0 240 240"
        className="w-full h-full block"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="240" height="240" rx="52" fill="#000000" />
        <text
          x="120"
          y="146"
          textAnchor="middle"
          fill="#FFFFFF"
          fontFamily="'Plus Jakarta Sans', 'Outfit', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
          fontWeight="900"
          fontSize="68"
          letterSpacing="-1px"
        >
          SOKO
        </text>
      </svg>
    </div>
  );
};

export default SokoLogo;
