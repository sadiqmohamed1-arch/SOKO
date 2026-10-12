import React from 'react';

export const PhoneFrame: React.FC<{ children: React.ReactNode; className?: string; label?: string }> = ({ children, className = '', label }) => (
  <div className={`relative flex flex-col rounded-[2rem] border border-soko-line bg-soko-ink p-1.5 shadow-[0_24px_60px_-20px_rgba(11,13,18,0.45)] ${className}`}>
    {label && <span className="sr-only">{label}</span>}
    <div className="relative flex flex-1 flex-col overflow-hidden rounded-[1.6rem] bg-white">
      <div aria-hidden="true" className="flex items-center justify-between px-5 pb-1 pt-2.5 text-[10px] font-semibold text-soko-ink">
        <span>9:41</span>
        <span className="h-4 w-16 rounded-full bg-soko-ink" />
        <span className="flex gap-0.5">
          <span className="h-2 w-1 rounded-sm bg-soko-ink" />
          <span className="h-2 w-1 rounded-sm bg-soko-ink" />
          <span className="h-2 w-1 rounded-sm bg-soko-ink/40" />
        </span>
      </div>
      {children}
    </div>
  </div>
);

export const DemoAvatar: React.FC<{ src?: string; initials: string; className?: string }> = ({ src, initials, className = 'h-10 w-10' }) =>
  src ? (
    <img src={src} alt="" width={80} height={80} className={`shrink-0 rounded-full object-cover ${className}`} />
  ) : (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full bg-soko-mist text-xs font-semibold text-soko-ink ${className}`}>
      {initials}
    </span>
  );

export const AppleIcon: React.FC<{ className?: string }> = ({ className = 'h-6 w-6' }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M16.37 12.7c.02 2.5 2.2 3.33 2.22 3.34-.02.06-.35 1.19-1.15 2.36-.69 1.01-1.41 2.02-2.55 2.04-1.11.02-1.47-.66-2.75-.66-1.28 0-1.67.64-2.73.68-1.1.04-1.94-1.09-2.64-2.1-1.43-2.07-2.53-5.85-1.06-8.4.73-1.27 2.03-2.07 3.45-2.09 1.08-.02 2.09.73 2.75.73.66 0 1.89-.9 3.19-.77.54.02 2.07.22 3.05 1.65-.08.05-1.82 1.06-1.8 3.17ZM14.27 5.57c.58-.71.98-1.69.87-2.67-.84.03-1.86.56-2.46 1.27-.54.62-1.01 1.62-.88 2.58.94.07 1.89-.47 2.47-1.18Z" />
  </svg>
);

export const GooglePlayIcon: React.FC<{ className?: string }> = ({ className = 'h-6 w-6' }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M4.2 2.6c-.25.26-.4.67-.4 1.2v16.4c0 .53.15.94.4 1.2l.06.05 9.18-9.18v-.22L4.26 2.55l-.06.05Z" opacity=".85" />
    <path d="m16.5 15.33-3.06-3.06v-.22l3.06-3.06.07.04 3.63 2.06c1.04.59 1.04 1.55 0 2.14l-3.63 2.06-.07.04Z" />
    <path d="M16.57 15.29 13.44 12.16 4.2 21.4c.34.36.9.4 1.54.05l10.83-6.16" opacity=".7" />
    <path d="M16.57 9.03 5.74 2.88C5.1 2.52 4.54 2.57 4.2 2.93l9.24 9.23 3.13-3.13Z" opacity=".55" />
  </svg>
);
