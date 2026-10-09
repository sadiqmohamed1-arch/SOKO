import React from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';

export interface SokoCrumb {
  label: string;
  onClick?: () => void;
}

interface SokoBreadcrumbProps {
  trail: SokoCrumb[];
  onBack: () => void;
  backLabel?: string;
  className?: string;
}

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1';

export const SokoBreadcrumb: React.FC<SokoBreadcrumbProps> = ({ trail, onBack, backLabel = 'Back', className = '' }) => (
  <div className={`flex items-center gap-3 min-w-0 ${className}`}>
    <button
      type="button"
      onClick={onBack}
      className={`${focus} inline-flex items-center gap-1.5 shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer`}
    >
      <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
      <span>{backLabel}</span>
    </button>
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1 text-xs text-slate-500 min-w-0">
        {trail.map((c, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={`${c.label}-${i}`} className={`flex items-center gap-1 ${last ? 'min-w-0' : 'shrink-0'}`}>
              {i > 0 && <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" aria-hidden />}
              {last || !c.onClick ? (
                <span className={`truncate ${last ? 'font-medium text-slate-900' : ''}`} aria-current={last ? 'page' : undefined}>{c.label}</span>
              ) : (
                <button type="button" onClick={c.onClick} className={`${focus} rounded hover:text-slate-900 hover:underline underline-offset-2 cursor-pointer`}>
                  {c.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  </div>
);
