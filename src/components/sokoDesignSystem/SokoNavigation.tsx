import React from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { sokoTokens } from './SokoComponents';

export interface SokoNavTarget {
  label: string;
  onClick: () => void;
}

export const SokoBackButton: React.FC<{ previous?: SokoNavTarget; fallback: SokoNavTarget }> = ({ previous, fallback }) => {
  const target = previous ?? fallback;
  return (
    <button
      type="button"
      onClick={target.onClick}
      className={`${sokoTokens.focus} inline-flex items-center gap-1.5 h-8 pl-2 pr-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer`}
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      Back to {target.label}
    </button>
  );
};

export interface SokoCrumb {
  label: string;
  onClick?: () => void;
}

export const SokoBreadcrumbs: React.FC<{ items: SokoCrumb[] }> = ({ items }) => (
  <nav aria-label="Breadcrumb">
    <ol className="flex flex-wrap items-center gap-1 text-xs">
      {items.map((c, i) => {
        const current = i === items.length - 1;
        return (
          <li key={`${c.label}-${i}`} className="inline-flex items-center gap-1">
            {current || !c.onClick ? (
              <span aria-current={current ? 'page' : undefined} className={current ? 'font-semibold text-slate-900' : 'text-slate-500'}>{c.label}</span>
            ) : (
              <button type="button" onClick={c.onClick} className={`${sokoTokens.focus} rounded text-slate-500 hover:text-blue-700 transition-colors cursor-pointer`}>{c.label}</button>
            )}
            {!current && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
          </li>
        );
      })}
    </ol>
  </nav>
);

export const SokoPageTrail: React.FC<{ crumbs: SokoCrumb[]; previous?: SokoNavTarget; fallback: SokoNavTarget }> = ({ crumbs, previous, fallback }) => (
  <div className="flex flex-wrap items-center gap-3">
    <SokoBackButton previous={previous} fallback={fallback} />
    <SokoBreadcrumbs items={crumbs} />
  </div>
);
