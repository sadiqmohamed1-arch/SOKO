import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ProfileDialogProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  size?: 'md' | 'lg';
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export const ProfileDialog: React.FC<ProfileDialogProps> = ({ title, subtitle, onClose, size = 'md', footer, children }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-slate-900/50 cursor-default animate-[fadeIn_150ms_ease-out]" />
      <div
        className={`relative w-full ${size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-md'} bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col animate-[slideUp_200ms_ease-out]`}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 leading-tight">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 -m-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-slate-100">{footer}</div>}
      </div>
    </div>
  );
};
