import React, { useEffect, useRef } from 'react';
import { X, type LucideIcon } from 'lucide-react';

interface AdminDrawerProps {
  titleId: string;
  title: string;
  eyebrow?: React.ReactNode;
  icon: LucideIcon;
  onClose: () => void;
  footer?: React.ReactNode;
  /** Tailwind max-width class for the panel. */
  width?: string;
  children: React.ReactNode;
}

export const AdminDrawer: React.FC<AdminDrawerProps> = ({ titleId, title, eyebrow, icon: Icon, onClose, footer, width = 'max-w-3xl', children }) => {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden="true" />
      <section role="dialog" aria-modal="true" aria-labelledby={titleId} className={`relative flex h-full w-full ${width} flex-col bg-slate-50 shadow-2xl`}>
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              {eyebrow && <span className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">{eyebrow}</span>}
              <h2 id={titleId} className="truncate text-base font-bold text-slate-900">
                {title}
              </h2>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <footer className="border-t border-slate-200 bg-white px-5 py-3">{footer}</footer>}
      </section>
    </div>
  );
};

export const FormField: React.FC<{ id: string; label: string; required?: boolean; hint?: React.ReactNode; tag?: React.ReactNode; children: React.ReactNode }> = ({ id, label, required, hint, tag, children }) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
      <span>
        {label}
        {required && (
          <span className="text-rose-600" aria-hidden="true">
            {' *'}
          </span>
        )}
      </span>
      {tag}
    </label>
    {children}
    {hint && <p className="text-[11px] leading-relaxed text-slate-500">{hint}</p>}
  </div>
);

export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600';

export const NotInSchemaTag: React.FC = () => (
  <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">Not stored yet</span>
);

export const LocalTag: React.FC<{ label?: string }> = ({ label = 'Works locally' }) => (
  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">{label}</span>
);

export const FormSection: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
    <header className="flex flex-col gap-0.5">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      {description && <p className="text-xs leading-relaxed text-slate-500 text-pretty">{description}</p>}
    </header>
    {children}
  </section>
);
